# Environment Setup

Complete these steps before developing. Estimated time: 30 minutes.

## 1. Rust + Solana + Anchor (for `contracts/`)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Anchor (via avm)
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.31.1
avm use 0.31.1

# Nightly toolchain — REQUIRED for IDL generation.
# Anchor 0.31's `anchor build` compiles the IDL with the `nightly` toolchain,
# and its IDL deps (darling, serde_with) need rustc >= 1.88. An outdated
# nightly causes: "rustc 1.85.0-nightly is not supported by the following
# packages". Fix by keeping nightly current:
rustup toolchain install nightly
rustup update nightly

# Verify
solana --version
anchor --version
rustup run nightly rustc --version   # must be >= 1.88
```

> **Build note:** `Cargo.lock` is committed on purpose — it pins a few deps
> (time, idna_adapter/icu) to versions compatible with the Solana platform-tools
> toolchain. Don't delete it. The on-chain program id is
> `BLTxBWAv3JwewqX8U3TuNBPuTBUyaCd8DSQP1DVGhQiY` (declared in `lib.rs` and
> `Anchor.toml`).

## 2. Node.js (for `web/`)

```bash
# Use Node 20 LTS or newer
node --version   # should be >= 20

# If not installed, use nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

## 3. Solana wallet (devnet)

```bash
# Generate a dev keypair (NEVER use this for mainnet)
solana-keygen new --outfile ~/.config/solana/devnet.json

# Point to devnet
solana config set --url devnet --keypair ~/.config/solana/devnet.json

# Get free devnet SOL
solana airdrop 2
solana balance
```

## 4. Environment variables

Copy `.env.example` to `.env` in each package and fill in values.
**Never commit `.env`.** It's gitignored.

```bash
cp web/.env.example web/.env
cp scripts/.env.example scripts/.env
```

## 5. First build

```bash
cd contracts && anchor build && anchor test
```

If `anchor test` passes, your environment is ready.

---

## Network note

If you're behind a restrictive firewall, ensure these domains are reachable:
`github.com`, `crates.io`, `registry.npmjs.org`, `api.devnet.solana.com`, `release.solana.com`
