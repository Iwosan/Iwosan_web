import { StellarToml } from '@stellar/stellar-sdk';
import { signWithWallet } from '@/lib/marketplace';
import { setApiAuthToken } from '@/services/api.service';
import {
  fetchWalletChallenge,
  startAnchorInteraction,
  submitWalletChallenge,
  type AnchorDirection,
  type AnchorInteraction,
} from '@/services/anchor.service';

export const ANCHOR_HOME_DOMAIN =
  process.env.NEXT_PUBLIC_ANCHOR_HOME_DOMAIN || 'testanchor.stellar.org';
export const ANCHOR_ASSET_CODE = process.env.NEXT_PUBLIC_ANCHOR_ASSET_CODE || 'USDC';

/** Refresh tokens this long before they expire. */
const EXPIRY_MARGIN_MS = 60_000;

interface CachedToken {
  account: string;
  token: string;
  expiresAt: number;
}

let apiSession: CachedToken | null = null;
let anchorSession: CachedToken | null = null;

function isFresh(session: CachedToken | null, account: string, now = Date.now()): boolean {
  return Boolean(
    session && session.account === account && session.expiresAt - EXPIRY_MARGIN_MS > now,
  );
}

/** Expiry (ms since epoch) from a JWT's `exp` claim; `0` when it cannot be read. */
export function jwtExpiry(token: string): number {
  try {
    const payload = token.split('.')[1] ?? '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/** Log in to the Iwosan API by signing its SEP-10 challenge with the wallet. */
export async function ensureApiSession(account: string): Promise<void> {
  if (isFresh(apiSession, account)) {
    return;
  }
  const challenge = await fetchWalletChallenge(account);
  const signed = await signWithWallet(challenge.transaction);
  const { tokens } = await submitWalletChallenge(account, signed);
  apiSession = {
    account,
    token: tokens.accessToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  setApiAuthToken(tokens.accessToken);
}

/** Log in to the anchor (its own SEP-10) and return its token. */
export async function anchorAuthToken(account: string): Promise<string> {
  if (anchorSession && isFresh(anchorSession, account)) {
    return anchorSession.token;
  }
  const toml = await StellarToml.Resolver.resolve(ANCHOR_HOME_DOMAIN);
  const authEndpoint = toml.WEB_AUTH_ENDPOINT;
  if (!authEndpoint) {
    throw new Error(`${ANCHOR_HOME_DOMAIN} does not support wallet login (SEP-10).`);
  }

  const challengeResponse = await fetch(`${authEndpoint}?account=${encodeURIComponent(account)}`);
  if (!challengeResponse.ok) {
    throw new Error('The anchor did not return a login challenge.');
  }
  const { transaction } = (await challengeResponse.json()) as { transaction: string };
  const signed = await signWithWallet(transaction);

  const tokenResponse = await fetch(authEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signed }),
  });
  if (!tokenResponse.ok) {
    throw new Error('The anchor rejected the wallet login.');
  }
  const { token } = (await tokenResponse.json()) as { token: string };
  anchorSession = { account, token, expiresAt: jwtExpiry(token) };
  return token;
}

/** Sign in where needed and start a deposit or withdrawal with the anchor. */
export async function startCashFlow(
  direction: AnchorDirection,
  account: string,
  amount?: string,
): Promise<AnchorInteraction> {
  await ensureApiSession(account);
  const authToken = await anchorAuthToken(account);
  return startAnchorInteraction(direction, {
    account,
    assetCode: ANCHOR_ASSET_CODE,
    authToken,
    ...(amount ? { amount } : {}),
  });
}

/**
 * Open the anchor's page in a popup. Returns `false` when the browser blocks
 * it, so the caller can show a link instead.
 */
export function openAnchorPopup(url: string): boolean {
  const popup = window.open(url, 'iwosan-anchor', 'width=480,height=720');
  if (!popup) {
    return false;
  }
  // The anchor page must not be able to navigate this tab.
  popup.opener = null;
  return true;
}

/** Forget cached sessions, e.g. when the wallet disconnects. */
export function clearSessions(): void {
  apiSession = null;
  anchorSession = null;
  setApiAuthToken(null);
}
