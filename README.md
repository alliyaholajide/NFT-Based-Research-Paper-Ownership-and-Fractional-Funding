# 📑 NFT-Based Research Paper Ownership and Fractional Funding

Welcome to a decentralized platform for protecting research paper ownership and enabling fractional funding using the Stacks blockchain! This project empowers researchers to register their academic works as NFTs, prove ownership, and raise funds through fractionalized ownership, democratizing access to research funding.

## ✨ Features

🔒 **Immutable Ownership**: Register research papers as NFTs with unique hashes to prove ownership.  
💸 **Fractional Funding**: Allow investors to purchase fractional shares of the NFT to fund research.  
📜 **Timestamped Registration**: Record creation timestamps for indisputable proof of authorship.  
✅ **Ownership Verification**: Instantly verify the creator and ownership details of a registered paper.  
💰 **Fund Distribution**: Automatically distribute funds to researchers based on fractional ownership.  
🔐 **Prevent Duplicates**: Ensure no duplicate papers are registered.  
📊 **Funding Transparency**: Track funding contributions and disbursements on-chain.  
🔄 **Transferable Shares**: Enable investors to trade their fractional shares.  

## 🛠 How It Works

### For Researchers
1. Generate a SHA-256 hash of your research paper.  
2. Call the `register-paper` function with:
   - The paper's hash.
   - Title and description of the paper.
   - Total funding goal (in STX).
3. The paper is minted as an NFT, timestamped, and listed for fractional funding.  
4. Receive funds as investors purchase fractional shares.  

### For Investors
1. Browse registered papers using `get-paper-details`.  
2. Purchase fractional shares of an NFT using `fund-paper`.  
3. Receive proportional returns if the research yields commercial outcomes (e.g., patents).  
4. Trade fractional shares using `transfer-share`.  

### For Verifiers
1. Use `get-paper-details` to view registration info (hash, title, description, timestamp).  
2. Call `verify-ownership` to confirm the creator's ownership.  

