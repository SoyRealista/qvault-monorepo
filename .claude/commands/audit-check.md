Run a self-review of the smart contract against common Solana/Anchor vulnerabilities. This is NOT a substitute for a professional audit, but catches common issues early.

Check `contracts/src/lib.rs` for:

1. **Arithmetic** — all add/sub/mul/div use checked_* variants (no raw operators on balances)
2. **Account validation** — every account has proper constraints (owner checks, signer checks, PDA seeds)
3. **Authority checks** — admin-only instructions verify caller == config.admin
4. **Reentrancy / CPI safety** — no state changes after external CPI calls that could be exploited
5. **Integer overflow on token amounts** — especially in reward calculations
6. **Missing pause checks** — sensitive instructions respect the `paused` flag
7. **PDA bump consistency** — bumps stored and reused, not re-derived unsafely
8. **Unchecked accounts** — any UncheckedAccount has a documented CHECK comment and is validated
9. **Rounding / precision loss** — in fee splits and reward math
10. **Vesting / lockup bypass** — unstake respects unlock_at

Produce a markdown report with severity (Critical/High/Medium/Low/Info) for each finding, the line number, and a recommended fix. Do not modify code — just report.
