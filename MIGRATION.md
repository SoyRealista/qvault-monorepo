# 🚀 Moving QVAULT to Claude Code — Migration Guide

This guide gets you from "I have a folder of documents" to "I'm building the product in Claude Code." Read top to bottom.

---

## What you're getting

A ready-to-open monorepo (`qvault-monorepo/`) containing:

- **`CLAUDE.md`** — the master context file. Claude Code reads this automatically and instantly knows the entire project: token params, tech stack, conventions, safety rules.
- **The smart contract** — your full Anchor program, ready to build.
- **The landing page** — current static version.
- **All strategy docs** — whitepaper, tokenomics, playbook, deck (for reference).
- **Custom slash commands** — `/build-and-test`, `/deploy-devnet`, `/audit-check`, `/scaffold-dapp`.
- **CI pipeline, .gitignore, .env templates** — production hygiene from day one.

---

## Step-by-step

### 1. Get the folder onto your machine
Download `QVAULT_ClaudeCode_Package.zip`, unzip it. You'll have a `qvault-monorepo/` folder.

### 2. Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```
(Requires Node 18+. See https://docs.claude.com for the latest install instructions.)

### 3. Initialize git + push to GitHub
```bash
cd qvault-monorepo
git init
git add .
git commit -m "Initial QVAULT monorepo"
# Create a PRIVATE repo on GitHub, then:
git remote add origin git@github.com:YOURNAME/qvault.git
git push -u origin main
```
Keep it **private** until after audit.

### 4. Open in Claude Code
```bash
cd qvault-monorepo
claude
```
Claude Code automatically reads `CLAUDE.md` and has full context.

### 5. Set up your environment
Tell Claude Code: *"Read SETUP.md and help me install the toolchain."*
Or follow `SETUP.md` manually (Rust, Solana CLI, Anchor, Node).

### 6. First real task
Try one of these prompts:
- *"Read CLAUDE.md, then run /build-and-test"*
- *"Run /audit-check and give me the security report"*
- *"Run /scaffold-dapp to build the staking UI"*

---

## Recommended first sprint (week 1 in Claude Code)

| Day | Task | Command/Prompt |
|-----|------|----------------|
| 1 | Environment + first build | "Set up the toolchain per SETUP.md, then /build-and-test" |
| 2 | Self-audit the contract | "/audit-check" |
| 3 | Refactor contract into modules | "Refactor lib.rs into instructions/, state/, errors/ modules" |
| 4 | Write full test suite | "Write Anchor integration tests covering all 12 instructions" |
| 5 | Deploy to devnet | "/deploy-devnet" |
| 6-7 | Scaffold the dApp | "/scaffold-dapp" |

---

## What Claude Code can do that this chat can't

- **Run code** — actually compile the contract, run tests, see real errors, iterate
- **Multi-file edits** — refactor across dozens of files in one go
- **Persistent project** — the codebase lives on your machine and in git, not in a chat
- **Real deploys** — push to devnet, read on-chain state, debug live
- **Long autonomous tasks** — "build the whole staking UI" runs for many steps unattended

## What still needs YOU (the human)

- **Signing transactions** — any deploy or fund movement, you sign with your wallet
- **Mainnet decisions** — Claude Code prepares; you approve and execute
- **The audit** — book a professional firm (OtterSec/Halborn/Trail of Bits) before mainnet
- **Secrets** — you create accounts, you hold the keys

---

## Safety reminders (also in CLAUDE.md)

1. This is a financial product — bugs lose real money.
2. Professional audit is **mandatory** before mainnet.
3. Admin = multisig (Squads), never a single key, before mainnet.
4. Never commit `.env`, keys, or seed phrases.
5. "QVAULT" naming has a possible trademark conflict (SEALSQ Corp) — keep legal review on the radar.

---

## Questions Claude Code is great at answering once you're in

- "Why is this test failing?"
- "Is this instruction vulnerable to X?"
- "How do I integrate Raydium for the LP?"
- "Build me the airdrop distribution script."
- "Optimize the staking reward calculation for compute units."

Welcome to building. ⬡
