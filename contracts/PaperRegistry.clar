(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_DUPLICATE_HASH (err u101))
(define-constant ERR_INVALID_HASH (err u102))
(define-constant ERR_PAPER_NOT_FOUND (err u103))
(define-constant ERR_INVALID_FUNDING_GOAL (err u104))
(define-constant ERR_INVALID_TITLE (err u105))
(define-constant ERR_INVALID_DESCRIPTION (err u106))
(define-constant ERR_INVALID_PRINCIPAL (err u107))
(define-constant ERR_ALREADY_FUNDED (err u108))
(define-constant ERR_FUNDING_NOT_ACTIVE (err u109))

(define-data-var last-id uint u0)
(define-data-var authority-contract (optional principal) none)
(define-data-var registration-fee uint u1000)

(define-map Papers
  { paper-hash: (buff 32) }
  { creator: principal, title: (string-ascii 100), description: (string-ascii 500), timestamp: uint, funding-goal: uint, funded-amount: uint, is-active: bool }
)

(define-map PaperIds
  { paper-hash: (buff 32) }
  { id: uint }
)

(define-read-only (get-paper-details (hash (buff 32)))
  (map-get? Papers { paper-hash: hash })
)

(define-read-only (get-paper-id (hash (buff 32)))
  (map-get? PaperIds { paper-hash: hash })
)

(define-read-only (get-last-id)
  (ok (var-get last-id))
)

(define-read-only (get-registration-fee)
  (ok (var-get registration-fee))
)

(define-read-only (is-paper-registered (hash (buff 32)))
  (is-some (map-get? Papers { paper-hash: hash }))
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq hash 0x) (err ERR_INVALID_HASH) (ok true))
)

(define-private (validate-title (title (string-ascii 100)))
  (if (and (> (len title) u0) (<= (len title) u100)) (ok true) (err ERR_INVALID_TITLE))
)

(define-private (validate-description (description (string-ascii 500)))
  (if (and (> (len description) u0) (<= (len description) u500)) (ok true) (err ERR_INVALID_DESCRIPTION))
)

(define-private (validate-funding-goal (goal uint))
  (if (> goal u0) (ok true) (err ERR_INVALID_FUNDING_GOAL))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78)) (ok true) (err ERR_INVALID_PRINCIPAL))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) ERR_NOT_AUTHORIZED)
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-registration-fee (new-fee uint))
  (begin
    (asserts! (is-some (var-get authority-contract)) ERR_NOT_AUTHORIZED)
    (var-set registration-fee new-fee)
    (ok true)
  )
)

(define-public (register-paper (hash (buff 32)) (title (string-ascii 100)) (description (string-ascii 500)) (funding-goal uint))
  (let
    (
      (paper-id (+ (var-get last-id) u1))
      (authority (unwrap! (var-get authority-contract) ERR_NOT_AUTHORIZED))
    )
    (try! (validate-hash hash))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-funding-goal funding-goal))
    (asserts! (is-none (map-get? Papers { paper-hash: hash })) ERR_DUPLICATE_HASH)
    (try! (stx-transfer? (var-get registration-fee) tx-sender authority))
    (map-insert Papers
      { paper-hash: hash }
      { creator: tx-sender, title: title, description: description, timestamp: block-height, funding-goal: funding-goal, funded-amount: u0, is-active: true }
    )
    (map-insert PaperIds { paper-hash: hash } { id: paper-id })
    (var-set last-id paper-id)
    (print { event: "paper-registered", id: paper-id, hash: hash })
    (ok paper-id)
  )
)

(define-public (verify-ownership (hash (buff 32)))
  (let
    (
      (paper (map-get? Papers { paper-hash: hash }))
    )
    (match paper
      p (ok (is-eq (get creator p) tx-sender))
      ERR_PAPER_NOT_FOUND
    )
  )
)

(define-public (update-paper-metadata (hash (buff 32)) (new-title (string-ascii 100)) (new-description (string-ascii 500)))
  (let
    (
      (paper (unwrap! (map-get? Papers { paper-hash: hash }) ERR_PAPER_NOT_FOUND))
    )
    (asserts! (is-eq (get creator paper) tx-sender) ERR_NOT_AUTHORIZED)
    (try! (validate-title new-title))
    (try! (validate-description new-description))
    (map-set Papers
      { paper-hash: hash }
      {
        creator: (get creator paper),
        title: new-title,
        description: new-description,
        timestamp: (get timestamp paper),
        funding-goal: (get funding-goal paper),
        funded-amount: (get funded-amount paper),
        is-active: (get is-active paper)
      }
    )
    (print { event: "paper-updated", hash: hash })
    (ok true)
  )
)

(define-public (deactivate-paper (hash (buff 32)))
  (let
    (
      (paper (unwrap! (map-get? Papers { paper-hash: hash }) ERR_PAPER_NOT_FOUND))
    )
    (asserts! (is-eq (get creator paper) tx-sender) ERR_NOT_AUTHORIZED)
    (map-set Papers
      { paper-hash: hash }
      {
        creator: (get creator paper),
        title: (get title paper),
        description: (get description paper),
        timestamp: (get timestamp paper),
        funding-goal: (get funding-goal paper),
        funded-amount: (get funded-amount paper),
        is-active: false
      }
    )
    (print { event: "paper-deactivated", hash: hash })
    (ok true)
  )
)