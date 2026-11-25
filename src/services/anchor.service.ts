import api from '@/services/api.service';

export type AnchorDirection = 'deposit' | 'withdraw';

/** Request body for `POST /payments/anchor/{deposit|withdraw}`. */
export interface AnchorInteractionRequest {
  /** Stellar account that receives (deposit) or sends (withdraw) the funds. */
  account: string;
  assetCode?: string;
  amount?: string;
  /** SEP-10 token the anchor issued to the user's wallet. */
  authToken?: string;
}

export interface AnchorInteraction {
  id: string;
  direction: AnchorDirection;
  status: string;
  /** Anchor page where the user completes the deposit or withdrawal. */
  url: string;
  anchorTransactionId: string | null;
}

/** Response of the API's SEP-10 wallet login. */
export interface WalletAuthResponse {
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
}

/**
 * Start a SEP-24 interactive deposit (cash in) or withdrawal (cash out).
 * @param direction - `deposit` to add money, `withdraw` to cash out.
 * @param body - The account, asset, optional amount and anchor SEP-10 token.
 * @returns The {@link AnchorInteraction}, including the anchor URL to open.
 * @throws {ApiError} 401 without a wallet login, 502 when the anchor is unavailable.
 */
export const startAnchorInteraction = (
  direction: AnchorDirection,
  body: AnchorInteractionRequest,
) => api.post<AnchorInteraction>(`/payments/anchor/${direction}`, body).then((r) => r.data);

/** SEP-10 challenge for logging in to the Iwosan API with a wallet. */
export const fetchWalletChallenge = (account: string) =>
  api
    .get<{ transaction: string; network_passphrase: string }>('/auth/stellar/challenge', {
      params: { account },
    })
    .then((r) => r.data);

/** Exchange a signed SEP-10 challenge for API tokens. */
export const submitWalletChallenge = (account: string, transaction: string) =>
  api.post<WalletAuthResponse>('/auth/stellar/token', { account, transaction }).then((r) => r.data);
