# QVAULT ($QVLT) — Project Context for Claude Code

> This file gives Claude Code full context on the QVAULT project. Read it first before any task.

---

## What is QVAULT?

QVAULT is a **community-first crypto protocol** launching on **Solana** with a quantum-resistant security narrative. The project combines three angles: quantum security, DeFi utility, and organic community growth.

- **Token:** `$QVLT` — Solana SPL token, 1,000,000,000 total supply, 9 decimals
- **Domain:** `qvault.es` (registered via Arsys)
- **Launch model:** Fair launch on Raydium, no VC presale, selective airdrop
- **TGE target:** Q3 2026

### The three-layer thesis
1. **Community & Governance** — DAO of holders, weighted voting
2. **DeFi Utility** — 3 staking tiers (Electron/Photon/Qubit), fee-sharing, buyback-and-burn
3. **Quantum-Resistant L1** — proprietary chain (Phase 3, 2027-28) using NIST CRYSTALS-Dilithium

---

## Monorepo Structure

```
qvault-monorepo/
├── CLAUDE.md              ← You are here. Master context.
├── README.md             ← Human-readable project overview
├── ROADMAP.md            ← Development phases & milestones
├── .claude/
│   └── commands/         ← Custom slash commands for common tasks
├── contracts/            ← Solana/Anchor smart contract (Rust)
│   ├── src/lib.rs        ← Main program: token + staking + governance
│   ├── Cargo.toml
│   └── Anchor.toml
├── web/                  ← Frontend (landing + dApp)
│   └── public/index.html ← Current static landing page
├── docs/                 ← All strategy & reference documents
└── scripts/              ← Deploy & automation scripts
```

---

## Tech Stack (decided)

| Layer | Choice | Status |
|-------|--------|--------|
| Blockchain | Solana | ✅ Decided |
| Smart contract | Rust + Anchor 0.31.1 | ✅ Builds + IDL, deployed to devnet, needs audit |
| Token standard | SPL Token + Metaplex metadata | ✅ Implemented |
| Web hosting | Cloudflare Pages (free) | 🔜 To set up |
| Domain | qvault.es (Arsys) | 🔜 Registering |
| Email | Arsys Correo Profesional (5 boxes) | 🔜 To set up |
| dApp framework | Next.js + React (recommended) | 🔜 To build |
| Wallet integration | @solana/wallet-adapter | 🔜 To build |
| DEX | Raydium (launch), Orca, Jupiter | 🔜 Phase 1 |

---

## Current State (what exists)

- ✅ **Smart contract** — full Anchor program in `contracts/src/lib.rs` (12 instructions: init, stake, unstake, claim, distribute_fees, burn, governance). NOT audited.
- ✅ **Landing page** — static HTML in `web/public/index.html` (dark cyberpunk design)
- ✅ **Whitepaper, pitch deck, tokenomics model, community playbook** — in `docs/`
- ❌ **dApp** — not built yet (staking UI, governance UI, wallet connect)
- ❌ **Backend** — not built (whitelist capture, Quantum Quiz, metrics API)
- ❌ **Deployment** — nothing deployed yet

---

## Key Token Parameters (must stay consistent everywhere)

```
TOTAL_SUPPLY     = 1,000,000,000 QVLT (9 decimals)
TIER_ELECTRON    = 10,000 QVLT    (APY 8-12%)
TIER_PHOTON      = 50,000 QVLT    (APY 14-20%)
TIER_QUBIT       = 250,000 QVLT   (APY 22-30%)

Fee split: 40% stakers | 20% buyback&burn | 25% DAO | 15% growth

Distribution:
  Fair Launch        40%  (400M) — no lock
  Community          25%  (250M) — 36mo linear
  DAO Treasury       15%  (150M) — DAO controlled
  Team & Advisors    10%  (100M) — 12mo cliff + 24mo
  Liquidity           7%  (70M)  — protocol-locked
  Strategic Partners  3%  (30M)  — 6mo cliff + 18mo
```

---

## Development Priorities (in order)

1. **Audit prep** — clean up contract, write full test suite, prep for OtterSec/Halborn audit
2. **dApp scaffold** — Next.js app with wallet connect, staking UI, governance UI
3. **Backend/API** — whitelist capture, Quantum Quiz, on-chain metrics dashboard
4. **Devnet deployment** — deploy contract, test full flow end-to-end
5. **Landing → production** — move static landing to Next.js, deploy on Cloudflare Pages
6. **Mainnet prep** — audit complete, multisig setup, security checklist

---

## Coding Conventions

- **Rust/Anchor:** follow existing style in `lib.rs`. All arithmetic uses `checked_*`. PDAs for all accounts. Emit events for all state changes.
- **Frontend:** TypeScript strict mode. React functional components + hooks. Tailwind for styling (match the cyberpunk palette below).
- **Never** hardcode private keys, seed phrases, or API keys. Use `.env` (gitignored).
- **Never** deploy to mainnet without explicit human approval.

### Brand palette (use in all UI)
```
navy   #07071A   violet #6C63FF   cyan  #00D4FF
green  #00FF9D   pink   #FF6B9D   gold  #FFD166
```
Fonts: Syne (display), Share Tech Mono (mono), DM Sans (body)

---

## Critical Safety Rules

- This is a **financial product**. Bugs can cause irreversible loss of funds.
- The smart contract MUST be audited by a professional firm before mainnet.
- Admin authority must be a **multisig** (Squads Protocol) before mainnet — never a single key.
- All financial operations (deploys, transfers) require the human to sign with their own wallet. Claude Code prepares; the human executes.
- "QVAULT" had a trademark conflict (SEALSQ Corp has a "QVault TPM" product). Legal review pending — keep an eye on naming in public-facing materials.

---

## Useful Context Links

- Solana docs: https://solana.com/docs
- Anchor book: https://www.anchor-lang.com
- Metaplex: https://developers.metaplex.com
- NIST PQC standards: CRYSTALS-Dilithium (FIPS 204), SPHINCS+ (FIPS 205)
