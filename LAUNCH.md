# QVAULT — Launch Plan & Checklist

Status snapshot (2026-06-07): contract v2 built, reviewed, deployed & flow-tested
on **devnet**; trilingual whitepaper done. This is the path to a **mainnet** launch.

Legend: ✅ done · 🟡 in progress · 🔲 todo · 🔴 hard blocker (no mainnet without it)

---

## Phase 0 — Foundations (mostly done)
- ✅ Smart contract v2 (staking, fees, buyback, governance, distribution, vesting)
- ✅ Internal security review (`AUDIT.md`) + critical fixes
- ✅ Devnet deploy + end-to-end flow test (`contracts/tests/flow.ts`)
- ✅ IDL generated & published on-chain (devnet)
- ✅ Whitepaper EN/ES/ZH
- 🟡 Token logo + on-chain metadata JSON
- 🔲 Formal automated test suite (unit/integration for all 16 instructions)

## Phase 1 — Pre-mainnet hardening (🔴 launch gate)
- 🔴 **Professional audit** (OtterSec / Halborn / Trail of Bits). Budget ~$20k–$60k, ~2–5 weeks lead time. Book early.
- 🔴 **Multisig admin** via Squads Protocol (replace single-key admin before any mainnet authority is granted).
- 🔲 Decide & document the **reward-funding model** (APY sustainability — rewards paid from treasury today).
- 🔲 Decide on **governance**: keep signaling-only or wire `execute_proposal` to real actions.
- 🔲 Consider **revoking mint authority** post-init to prove fixed supply on-chain.
- 🔲 Resolve ⚠️ **"QVAULT" trademark** question vs SEALSQ Corp (legal review) — before heavy brand spend.

## Phase 2 — The dApp / web (can build now, against devnet)
- 🔲 Production landing page
- 🔲 Wallet connect (Phantom / Solflare via `@solana/wallet-adapter`)
- 🔲 Staking UI (stake / unstake / claim, tier display, APY)
- 🔲 "Buy $QVLT" → Raydium swap/link
- 🔲 Vesting claim UI (team / community / partners)
- 🔲 (optional v1) Governance UI (proposals / voting)
- 🔲 Hosting on Cloudflare Pages; connect domain
- 🔲 Analytics + on-chain metrics dashboard (total staked, burned, etc.)

## Phase 3 — Brand, legal & infra
- 🔲 Domain `qvault.es` live + professional email
- 🔲 Logo & brand kit; host `metadata/qvlt.json` at the TOKEN_URI
- 🔲 Legal structure + disclaimers for token distribution
- 🔲 Privacy policy / terms for the web

## Phase 4 — Mainnet launch
- 🔴 **Liquidity capital** for the Raydium pool (SOL/USDC to pair with $QVLT)
- 🔲 Deploy audited contract to mainnet-beta
- 🔲 Run `initialize` (mint 1B), set metadata
- 🔲 Set up vesting schedules (team/community/partners) + treasury allocation per tokenomics
- 🔲 Seed & **lock** Raydium liquidity pool (fair launch)
- 🔲 Transfer all authorities to the multisig; verify
- 🔲 Public contract address + verified build

## Phase 5 — Community & go-to-market (parallel)
- 🔲 X (Twitter), Discord, Telegram presence
- 🔲 Launch content riding the quantum-security news cycle
- 🔲 Ambassador / referral / content-bounty programs
- 🔲 QVAULT Academy + weekly security briefings

---

## Critical path (shortest route to live)
1. **Build the dApp on devnet** (no external dependency) — in progress.
2. **Add formal tests** (also an audit prerequisite).
3. **Book the audit** + set up the **multisig** (external, long lead — start ASAP in parallel).
4. Sort **domain, logo/metadata, legal**.
5. Secure **liquidity capital**.
6. Audit clears → **mainnet deploy + LP seed + launch**.

> Biggest external dependencies (start now): audit booking, liquidity capital, legal/trademark.
