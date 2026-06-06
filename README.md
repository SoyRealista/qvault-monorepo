# ⬡ QVAULT ($QVLT)

> The Quantum-Proof Community Protocol — Solana

This is the development monorepo for QVAULT. If you're using **Claude Code**, start by reading `CLAUDE.md` — it has full project context.

## Quick Start

```bash
# 1. Read the context
cat CLAUDE.md

# 2. Install toolchains (see SETUP.md for details)
#    - Rust + Solana CLI + Anchor (for contracts/)
#    - Node 20+ (for web/)

# 3. Contracts
cd contracts
anchor build
anchor test

# 4. Web (once scaffolded)
cd web
npm install
npm run dev
```

## Repo Layout

| Folder | What's in it |
|--------|--------------|
| `contracts/` | Solana smart contract (Rust/Anchor) — token, staking, governance |
| `web/` | Frontend — landing page + dApp (to be built) |
| `docs/` | Whitepaper, tokenomics, community playbook, strategy |
| `scripts/` | Deploy & automation |
| `.claude/` | Claude Code custom commands |

## Project Status

🟢 Smart contract written (needs audit)
🟢 Landing page (static)
🟡 dApp — not started
🟡 Backend — not started
🔴 Nothing deployed yet

See `ROADMAP.md` for the full plan.

## License

MIT. Not financial advice. Audit before production.

© 2026 QVAULT Protocol
