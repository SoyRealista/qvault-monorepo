// Small persistence layer. We only ever store the Phantom *session* (a public
// key + opaque session token + the channel shared-secret). We NEVER store a
// private key — those live exclusively inside Phantom.
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PhantomSession = {
  publicKey: string;
  session: string;
  sharedSecret: string; // base58 — channel encryption only, not a wallet key
  phantomEncryptionPublicKey: string;
};

const KEY = "qvault.phantom.session";

export async function saveSession(s: PhantomSession): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

export async function loadSession(): Promise<PhantomSession | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as PhantomSession) : null;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
