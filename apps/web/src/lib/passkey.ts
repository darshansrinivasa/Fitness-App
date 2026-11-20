const CRED_KEY = 'los-passkey';
const ENABLED_KEY = 'los-passkey-enabled';
const UNLOCK_KEY = 'los-unlocked';

export function passkeySupported(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && 'PublicKeyCredential' in window;
}

export function passkeyEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === '1';
}

export function isUnlocked(): boolean {
  return sessionStorage.getItem(UNLOCK_KEY) === '1';
}

export function markUnlocked(): void {
  sessionStorage.setItem(UNLOCK_KEY, '1');
}

function bytesToB64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function b64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function registerPasskey(userId: string, name: string): Promise<void> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Lifestyle OS' },
      user: {
        id: new TextEncoder().encode(userId),
        name,
        displayName: name,
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey was not created.');
  localStorage.setItem(
    CRED_KEY,
    JSON.stringify({ id: credential.id, rawId: bytesToB64(credential.rawId) }),
  );
  localStorage.setItem(ENABLED_KEY, '1');
  markUnlocked();
}

export async function unlockWithPasskey(): Promise<void> {
  const stored = localStorage.getItem(CRED_KEY);
  if (!stored) throw new Error('No passkey is saved on this browser.');
  const parsed = JSON.parse(stored) as { rawId: string };
  const result = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: b64ToBytes(parsed.rawId) }],
      userVerification: 'required',
      timeout: 60_000,
    },
  });
  if (!result) throw new Error('Unlock was cancelled.');
  markUnlocked();
}

export function disablePasskey(): void {
  localStorage.removeItem(CRED_KEY);
  localStorage.removeItem(ENABLED_KEY);
  sessionStorage.removeItem(UNLOCK_KEY);
}
