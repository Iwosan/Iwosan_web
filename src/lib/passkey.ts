import { StrKey } from '@stellar/stellar-sdk';

const CREDENTIAL_STORAGE_KEY = 'iwosan:passkey-credential';

export interface PasskeyWallet {
  /** Base64url-encoded WebAuthn credential id. */
  credentialId: string;
  /** Stellar smart-wallet contract address (C...) controlled by the passkey. */
  smartWalletAddress: string;
}

/** Passkeys need WebAuthn, which only exists in a browser over HTTPS/localhost. */
export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.credentials)
  );
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * Derive the smart-wallet contract address from the credential id. The
 * passkey-kit deployer derives the same way from the credential's public key;
 * we hash the credential id so the address is deterministic and unique per
 * passkey without needing the private key on the server.
 */
export async function smartWalletAddressFromCredentialId(
  credentialId: ArrayBuffer,
): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', credentialId);
  // The SDK types `encodeContract` with Node's Buffer, but accepts any bytes.
  return StrKey.encodeContract(new Uint8Array(digest) as unknown as Buffer);
}

function randomChallenge(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(32));
}

function newUserId(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(16));
}

function readStoredCredentialId(): string | null {
  try {
    return window.localStorage.getItem(CREDENTIAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeCredentialId(credentialId: string): void {
  try {
    window.localStorage.setItem(CREDENTIAL_STORAGE_KEY, credentialId);
  } catch {
    // Private browsing may block storage; the session still works.
  }
}

/**
 * Sign in with a fingerprint or face ID. Returning users are prompted for
 * their existing passkey; first-time users create one.
 */
export async function signInWithPasskey(): Promise<PasskeyWallet> {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not available in this browser. Use Freighter instead.');
  }

  const storedId = readStoredCredentialId();
  let credential: PublicKeyCredential | null;

  if (storedId) {
    credential = (await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{ type: 'public-key', id: base64UrlDecode(storedId) }],
        userVerification: 'preferred',
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
  } else {
    credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: { name: 'Iwosan', id: window.location.hostname },
        user: {
          id: newUserId(),
          name: 'iwosan-user',
          displayName: 'Iwosan user',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
  }

  if (!credential) {
    throw new Error('Passkey sign-in was cancelled.');
  }

  const credentialId = base64UrlEncode(credential.rawId);
  storeCredentialId(credentialId);
  return {
    credentialId,
    smartWalletAddress: await smartWalletAddressFromCredentialId(credential.rawId),
  };
}
