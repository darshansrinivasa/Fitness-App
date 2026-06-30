import * as Crypto from 'expo-crypto';

/** UUID v4 for offline record creation (Hermes-safe). */
export function newId(): string {
  return Crypto.randomUUID();
}
