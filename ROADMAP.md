# QVAULT Development Roadmap

This is the **engineering** roadmap (what to build), distinct from the marketing roadmap in the whitepaper. Phases are ordered by dependency.

---

## Phase 0 — Foundation (current)

- [x] Smart contract written (`contracts/src/lib.rs`)
- [x] Static landing page
- [ ] Full test suite for contract (unit + integration)
- [ ] CI pipeline (GitHub Actions: build + test on push)
- [ ] `.env` templates and secrets management
- [ ] Repo published to private GitHub

## Phase 1 — Contract Hardening

- [ ] Refactor `lib.rs` into modules (instructions/, state/, errors/)
- [ ] 100% test coverage on all 12 instructions
- [ ] Fuzzing for arithmetic edge cases
- [ ] Devnet deployment + end-to-end flow test
- [ ] Internal security review against Solana common vulnerabilities
- [ ] Prep audit package for OtterSec / Halborn / Trail of Bits

**Exit criteria:** contract deployed on devnet, full test suite green, audit booked.

## Phase 2 — dApp MVP

- [ ] Next.js 14 app scaffold (App Router, TypeScript, Tailwind)
- [ ] Wallet connect (`@solana/wallet-adapter` — Phantom, Solflare, Backpack)
- [ ] Staking UI — stake/unstake/claim, show tier + APY + rewards
- [ ] Governance UI — view proposals, vote, create (Qubit only)
- [ ] Live protocol stats (total staked, burned, treasury) from on-chain
- [ ] Responsive + matches brand palette

**Exit criteria:** user can connect wallet and stake on devnet via the UI.

## Phase 3 — Backend & Growth Tooling

- [ ] Whitelist capture API (email + wallet, anti-bot)
- [ ] Quantum Security Quiz (5 questions → whitelist qualification)
- [ ] Quantum Threat Dashboard (check if a BTC/ETH address is exposed)
- [ ] Referral system with on-chain tracking
- [ ] Admin dashboard for metrics

**Exit criteria:** whitelist live on qvault.es, quiz functional.

## Phase 4 — Launch Prep

- [ ] Audit complete + all findings resolved
- [ ] Multisig (Squads) replaces admin keypair
- [ ] Mainnet deployment dry-run on devnet
- [ ] Raydium LP setup tested
- [ ] Airdrop distribution script tested on devnet
- [ ] Bug bounty program live
- [ ] Monitoring & alerts (Helius webhooks)

**Exit criteria:** green light on the master pre-launch checklist (see docs/playbook).

## Phase 5 — TGE & Beyond

- [ ] Mainnet deployment (human-signed)
- [ ] Selective airdrop distribution
- [ ] Staking live on mainnet
- [ ] CEX listing applications (MEXC, Gate.io → Tier 1 later)

## Phase 6 — Quantum L1 (2027-28, research)

- [ ] R&D on CRYSTALS-Dilithium signature integration
- [ ] Post-quantum VRF consensus prototype
- [ ] Testnet for proprietary QVAULT Chain
- [ ] Migration bridge from Solana

---

## First Tasks for Claude Code

Recommended starting prompts once the repo is open in Claude Code:

1. "Read CLAUDE.md, then refactor contracts/src/lib.rs into a clean module structure with separate files for instructions, state, and errors."
2. "Write a complete Anchor integration test suite for the staking flow."
3. "Scaffold a Next.js dApp in web/ with wallet adapter and a staking page matching our brand palette."
4. "Set up GitHub Actions CI to build and test the contract on every push."
