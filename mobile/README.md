# QVAULT Wallet — mobile companion app (iOS & Android)

A **non-custodial companion wallet** for $QVLT, built with Expo (React Native)
from a single TypeScript codebase. It never touches private keys: the user's
keys stay inside **Phantom**, which signs every transaction. Our app reads
balances, builds transactions, and hands them to Phantom over its encrypted
deeplink protocol.

## Features (v1)

- **Balance & portfolio** — QVLT + SOL balances, USD value, recent activity
- **Send / receive** — transfer QVLT/SOL, receive QR, scan-to-send QR
- **Staking** — stake, claim rewards, unstake; tier display (Electron/Photon/Qubit)
- **Community** — launch countdown / live price, links to web & X

## Architecture

```
index.ts ──> polyfills ──> App.tsx (navigation)
                              │
              WalletProvider (state + Phantom deeplink router)
                              │
   ┌──────────┬──────────────┼───────────────┬────────────┐
 Wallet     Send/Receive    Stake         Community     services/
 screen      screens        screen         screen       ├ solana.ts   (balances, transfers)
                                                          ├ phantom.ts  (encrypted deeplink connect/sign)
                                                          ├ qvault.ts   (staking txns via Anchor IDL)
                                                          ├ price.ts    (Jupiter / CoinGecko)
                                                          └ storage.ts  (session only — never keys)
```

Phantom signing uses the documented universal-link flow
(<https://docs.phantom.app/phantom-deeplinks>): an ephemeral x25519 keypair
encrypts the channel; the user approves and signs inside Phantom; the signature
comes back via a `qvault://onSign` deep link.

## Run locally (development)

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start            # press i (iOS sim) / a (Android) / scan QR with Expo Go*
```

\* Phantom deeplinks need a **real device** (or a simulator with Phantom
installed) and a **dev build** — they don't work in the web preview or plain
Expo Go for the signing round-trip. Balance/UI work everywhere.

## Pre-launch config

- `src/constants.ts`: `CLUSTER` is `devnet` until 7 Jul 2026. On launch day flip
  it to `mainnet-beta` and set the **real `QVLT_MINT`** (the mint that
  `initialize()` creates) — the program ID stays the same.
- The Telegram link in `constants.ts` is a placeholder until the channel exists.

## Build for the stores (EAS)

You need: an [Expo account](https://expo.dev) (free), an **Apple Developer**
account ($99/yr) and a **Google Play Developer** account ($25 one-time).
Claude can't submit for you — store submission requires your accounts.

```bash
npm i -g eas-cli
eas login
eas init                     # creates the projectId → paste into app.json extra.eas
eas build --platform ios     # produces an .ipa
eas build --platform android # produces an .aab
eas submit --platform ios        # uploads to App Store Connect
eas submit --platform android    # uploads to Google Play
```

### Store-review notes (important for crypto apps)

- **Apple**: wallet/crypto apps must be submitted by an **organization**
  account (not individual) in many regions. Provide a clear privacy policy URL
  and explain in review notes that the app is non-custodial and integrates the
  third-party Phantom wallet.
- **Google Play**: declare the crypto functionality in the Data Safety form;
  no on-device key custody simplifies this.
- Both stores require: app icon (1024², provided), screenshots, a privacy
  policy URL (host one at `qvlt.xyz/privacy`), and a support contact.

## What still needs doing before submission

- [ ] On-device testing of the full Phantom connect → sign → confirm round-trip
- [ ] Real mainnet `QVLT_MINT` + `CLUSTER=mainnet-beta` on launch day
- [ ] Polished app icon + splash + store screenshots (placeholders use the logo)
- [ ] Privacy policy page + support email
- [ ] EAS project setup + the two developer accounts
```
