Scaffold the QVAULT dApp in the web/ directory.

Requirements:
- Next.js 14 (App Router) + TypeScript (strict) + Tailwind CSS
- Solana wallet adapter (@solana/wallet-adapter-react, -wallets, -react-ui) supporting Phantom, Solflare, Backpack
- Anchor client (@coral-xyz/anchor) wired to read the IDL from contracts/target/idl/qvault.json
- Match the QVAULT brand palette and fonts (see CLAUDE.md)

Pages to create:
1. `/` — landing (port the existing web/public/index.html design into a React component)
2. `/stake` — connect wallet, show balance, stake/unstake/claim, display tier + APY + pending rewards
3. `/governance` — list proposals, vote (if Qubit tier), create proposal (if Qubit)
4. `/stats` — live protocol metrics read from chain (total staked, burned, treasury)

Use the token parameters and tier thresholds from CLAUDE.md. Keep all on-chain reads in a typed hooks layer (e.g. hooks/useQvault.ts). Mock data is fine until the contract is deployed to devnet, but structure the code so swapping mock → live is trivial.

Do not commit any secrets. Use NEXT_PUBLIC_ env vars per web/.env.example.
