import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

interface Paper {
  creator: string;
  title: string;
  description: string;
  timestamp: number;
  fundingGoal: number;
  fundedAmount: number;
  isActive: boolean;
}

interface PaperId {
  id: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

const ERR_NOT_AUTHORIZED = 100;
const ERR_DUPLICATE_HASH = 101;
const ERR_INVALID_HASH = 102;
const ERR_PAPER_NOT_FOUND = 103;
const ERR_INVALID_FUNDING_GOAL = 104;
const ERR_INVALID_TITLE = 105;
const ERR_INVALID_DESCRIPTION = 106;
const ERR_INVALID_PRINCIPAL = 107;

class PaperRegistryMock {
  state: {
    lastId: number;
    authorityContract: string | null;
    registrationFee: number;
    papers: Map<string, Paper>;
    paperIds: Map<string, PaperId>;
  } = {
    lastId: 0,
    authorityContract: null,
    registrationFee: 1000,
    papers: new Map(),
    paperIds: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  reset() {
    this.state = {
      lastId: 0,
      authorityContract: null,
      registrationFee: 1000,
      papers: new Map(),
      paperIds: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: ERR_INVALID_PRINCIPAL };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setRegistrationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.registrationFee = newFee;
    return { ok: true, value: true };
  }

  registerPaper(hash: string, title: string, description: string, fundingGoal: number): Result<number> {
    if (hash === "0x") return { ok: false, value: ERR_INVALID_HASH };
    if (!title || title.length > 100) return { ok: false, value: ERR_INVALID_TITLE };
    if (!description || description.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (fundingGoal <= 0) return { ok: false, value: ERR_INVALID_FUNDING_GOAL };
    if (this.state.papers.has(hash)) return { ok: false, value: ERR_DUPLICATE_HASH };
    if (!this.state.authorityContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.stxTransfers.push({ amount: this.state.registrationFee, from: this.caller, to: this.state.authorityContract });
    const paperId = this.state.lastId + 1;
    this.state.papers.set(hash, {
      creator: this.caller,
      title,
      description,
      timestamp: this.blockHeight,
      fundingGoal,
      fundedAmount: 0,
      isActive: true,
    });
    this.state.paperIds.set(hash, { id: paperId });
    this.state.lastId = paperId;
    return { ok: true, value: paperId };
  }

  getPaperDetails(hash: string): Paper | null {
    return this.state.papers.get(hash) || null;
  }

  getPaperId(hash: string): PaperId | null {
    return this.state.paperIds.get(hash) || null;
  }

  getLastId(): Result<number> {
    return { ok: true, value: this.state.lastId };
  }

  getRegistrationFee(): Result<number> {
    return { ok: true, value: this.state.registrationFee };
  }

  isPaperRegistered(hash: string): Result<boolean> {
    return { ok: true, value: this.state.papers.has(hash) };
  }

  verifyOwnership(hash: string): Result<boolean> {
    const paper = this.state.papers.get(hash);
    if (!paper) return { ok: false, value: ERR_PAPER_NOT_FOUND };
    return { ok: true, value: paper.creator === this.caller };
  }

  updatePaperMetadata(hash: string, newTitle: string, newDescription: string): Result<boolean> {
    const paper = this.state.papers.get(hash);
    if (!paper) return { ok: false, value: ERR_PAPER_NOT_FOUND };
    if (paper.creator !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!newTitle || newTitle.length > 100) return { ok: false, value: ERR_INVALID_TITLE };
    if (!newDescription || newDescription.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    this.state.papers.set(hash, { ...paper, title: newTitle, description: newDescription });
    return { ok: true, value: true };
  }

  deactivatePaper(hash: string): Result<boolean> {
    const paper = this.state.papers.get(hash);
    if (!paper) return { ok: false, value: ERR_PAPER_NOT_FOUND };
    if (paper.creator !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.papers.set(hash, { ...paper, isActive: false });
    return { ok: true, value: true };
  }
}

describe("PaperRegistry", () => {
  let contract: PaperRegistryMock;

  beforeEach(() => {
    contract = new PaperRegistryMock();
    contract.reset();
  });

  it("registers a paper successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerPaper("0xabc123", "Quantum Paper", "A quantum algorithm", 1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1);
    const paper = contract.getPaperDetails("0xabc123");
    expect(paper).toEqual({
      creator: "ST1TEST",
      title: "Quantum Paper",
      description: "A quantum algorithm",
      timestamp: 0,
      fundingGoal: 1000,
      fundedAmount: 0,
      isActive: true,
    });
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate paper hash", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerPaper("0xabc123", "Quantum Paper", "A quantum algorithm", 1000);
    const result = contract.registerPaper("0xabc123", "Another Paper", "Different description", 2000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DUPLICATE_HASH);
  });

  it("rejects invalid hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerPaper("0x", "Quantum Paper", "A quantum algorithm", 1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("rejects invalid title", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerPaper("0xabc123", "", "A quantum algorithm", 1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TITLE);
  });

  it("rejects invalid description", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerPaper("0xabc123", "Quantum Paper", "", 1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DESCRIPTION);
  });

  it("rejects invalid funding goal", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerPaper("0xabc123", "Quantum Paper", "A quantum algorithm", 0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_FUNDING_GOAL);
  });

  it("rejects registration without authority contract", () => {
    const result = contract.registerPaper("0xabc123", "Quantum Paper", "A quantum algorithm", 1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("verifies ownership correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerPaper("0xabc123", "Quantum Paper", "A quantum algorithm", 1000);
    const result = contract.verifyOwnership("0xabc123");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    contract.caller = "ST2FAKE";
    const result2 = contract.verifyOwnership("0xabc123");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("updates paper metadata successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerPaper("0xabc123", "Quantum Paper", "A quantum algorithm", 1000);
    const result = contract.updatePaperMetadata("0xabc123", "Updated Paper", "New description");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const paper = contract.getPaperDetails("0xabc123");
    expect(paper?.title).toBe("Updated Paper");
    expect(paper?.description).toBe("New description");
  });

  it("rejects metadata update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerPaper("0xabc123", "Quantum Paper", "A quantum algorithm", 1000);
    contract.caller = "ST2FAKE";
    const result = contract.updatePaperMetadata("0xabc123", "Updated Paper", "New description");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("deactivates paper successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerPaper("0xabc123", "Quantum Paper", "A quantum algorithm", 1000);
    const result = contract.deactivatePaper("0xabc123");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const paper = contract.getPaperDetails("0xabc123");
    expect(paper?.isActive).toBe(false);
  });

  it("rejects deactivation by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerPaper("0xabc123", "Quantum Paper", "A quantum algorithm", 1000);
    contract.caller = "ST2FAKE";
    const result = contract.deactivatePaper("0xabc123");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets registration fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setRegistrationFee(2000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.registrationFee).toBe(2000);
  });
});