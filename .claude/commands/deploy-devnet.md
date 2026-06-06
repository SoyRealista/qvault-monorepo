Deploy the QVAULT program to Solana devnet and run the initialize instruction.

IMPORTANT SAFETY:
- This is DEVNET only. Never use this command for mainnet.
- Confirm the wallet is set to a devnet keypair before proceeding.
- After deploy, update NEXT_PUBLIC_PROGRAM_ID in web/.env and PROGRAM_ID in scripts/.env with the new program ID.

Steps:
1. Verify `solana config get` shows devnet
2. Ensure wallet has SOL: `solana balance` (airdrop if < 1)
3. `cd contracts && anchor build`
4. `anchor deploy --provider.cluster devnet`
5. Capture the deployed program ID from output
6. Update declare_id! in lib.rs, Anchor.toml, and both .env files with the new ID
7. Rebuild and run the initialize script
8. Report the program ID, mint address, and treasury PDA
