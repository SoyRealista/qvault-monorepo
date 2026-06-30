/**
 * Phantom universal-link (deeplink) integration.
 *
 * This is how the companion app talks to the user's Phantom wallet WITHOUT ever
 * touching their private keys. Flow:
 *
 *   1. connect()  → we generate a throwaway x25519 keypair (the "dapp keypair"),
 *      open Phantom, and Phantom returns its own public key + an encrypted blob
 *      containing the user's wallet public key + a session token.
 *   2. We derive a shared secret (NaCl box) and decrypt that blob.
 *   3. signAndSendTransaction() → we serialize an unsigned transaction, encrypt
 *      it with the shared secret, open Phantom; the USER approves and signs in
 *      Phantom; Phantom broadcasts and returns the signature.
 *
 * The dapp keypair only encrypts the channel — it is NOT the user's wallet key.
 * Reference: https://docs.phantom.app/phantom-deeplinks
 */
import * as Linking from "expo-linking";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Buffer } from "buffer";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { PHANTOM_UL, CLUSTER } from "../constants";
import { loadSession, saveSession, clearSession, PhantomSession } from "./storage";

// Ephemeral keypair for this app instance (channel encryption only).
let dappKeyPair = nacl.box.keyPair();

export function resetDappKeyPair() {
  dappKeyPair = nacl.box.keyPair();
}

function buildRedirect(path: string): string {
  // e.g. qvault://onConnect — Phantom appends its response as query params.
  return Linking.createURL(path);
}

function encryptPayload(payload: object, sharedSecret: Uint8Array) {
  const nonce = nacl.randomBytes(24);
  const encrypted = nacl.box.after(
    Buffer.from(JSON.stringify(payload)),
    nonce,
    sharedSecret
  );
  return { nonce, encrypted };
}

function decryptPayload(
  data: string,
  nonce: string,
  sharedSecret: Uint8Array
): any {
  const decrypted = nacl.box.open.after(
    bs58.decode(data),
    bs58.decode(nonce),
    sharedSecret
  );
  if (!decrypted) throw new Error("Unable to decrypt Phantom response");
  return JSON.parse(Buffer.from(decrypted).toString("utf8"));
}

/** Open Phantom to connect. The response arrives via the deep-link handler. */
export async function connect(): Promise<void> {
  resetDappKeyPair();
  const params = new URLSearchParams({
    dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
    cluster: CLUSTER,
    app_url: "https://qvlt.xyz",
    redirect_link: buildRedirect("onConnect"),
  });
  await Linking.openURL(`${PHANTOM_UL}/connect?${params.toString()}`);
}

/** Parse the `onConnect` redirect, derive the shared secret, store the session. */
export async function handleConnectResponse(
  query: Record<string, string>
): Promise<PhantomSession> {
  if (query.errorCode) {
    throw new Error(query.errorMessage || "Phantom connection rejected");
  }
  const phantomPubKey = query.phantom_encryption_public_key;
  const sharedSecret = nacl.box.before(
    bs58.decode(phantomPubKey),
    dappKeyPair.secretKey
  );
  const connectData = decryptPayload(query.data, query.nonce, sharedSecret);

  const session: PhantomSession = {
    publicKey: connectData.public_key,
    session: connectData.session,
    sharedSecret: bs58.encode(sharedSecret),
    phantomEncryptionPublicKey: phantomPubKey,
  };
  await saveSession(session);
  return session;
}

export async function disconnect(): Promise<void> {
  await clearSession();
  resetDappKeyPair();
}

/**
 * Serialize an unsigned transaction, hand it to Phantom to sign + send.
 * The signature comes back asynchronously via the `onSign` deep link.
 */
export async function signAndSendTransaction(
  tx: Transaction | VersionedTransaction
): Promise<void> {
  const session = await loadSession();
  if (!session) throw new Error("Not connected to Phantom");

  const serialized =
    tx instanceof VersionedTransaction
      ? tx.serialize()
      : tx.serialize({ requireAllSignatures: false, verifySignatures: false });

  const sharedSecret = bs58.decode(session.sharedSecret);
  const { nonce, encrypted } = encryptPayload(
    { session: session.session, transaction: bs58.encode(serialized) },
    sharedSecret
  );

  const params = new URLSearchParams({
    dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
    nonce: bs58.encode(nonce),
    redirect_link: buildRedirect("onSign"),
    payload: bs58.encode(encrypted),
  });
  await Linking.openURL(
    `${PHANTOM_UL}/signAndSendTransaction?${params.toString()}`
  );
}

/** Parse the `onSign` redirect and return the broadcast signature. */
export function handleSignResponse(
  query: Record<string, string>,
  sharedSecretB58: string
): string {
  if (query.errorCode) {
    throw new Error(query.errorMessage || "Transaction rejected");
  }
  const data = decryptPayload(
    query.data,
    query.nonce,
    bs58.decode(sharedSecretB58)
  );
  return data.signature as string;
}
