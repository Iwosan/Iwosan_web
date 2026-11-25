import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { MarketplaceQuote } from '@/services/api.service';
import { signWithWallet } from '@/lib/marketplace';
import { STELLAR_CONFIG } from '@/lib/stellar';
import { useWalletStore } from '@/store/useWalletStore';

/** Assets a buyer can pay with. The listing's own currency needs no conversion. */
export const PAYMENT_ASSETS = [
  { code: 'USDC', label: 'USDC' },
  { code: 'NGN', label: 'Naira (NGN)' },
  { code: 'XLM', label: 'Lumens (XLM)' },
] as const;

/** Quotes are refreshed this often while the buyer is deciding. */
export const QUOTE_REFRESH_MS = 30_000;

/** Extra amount the buyer allows on top of the quote if the price moves. */
export const SLIPPAGE = 0.01;

const STROOPS_PER_UNIT = 10_000_000;

/** Parse `XLM`/`native` or `CODE:ISSUER` into a Stellar asset. */
export function parseAsset(value: string): Asset {
  if (value === 'XLM' || value === 'native') {
    return Asset.native();
  }
  const [code, issuer] = value.split(':');
  if (!code || !issuer) {
    throw new Error(`Unsupported asset "${value}"`);
  }
  return new Asset(code, issuer);
}

/** The most the buyer may send: the quoted amount plus slippage, rounded up to 7 decimals. */
export function maxSendAmount(sourceAmount: string, slippage = SLIPPAGE): string {
  const stroops = Math.ceil(Number(sourceAmount) * (1 + slippage) * STROOPS_PER_UNIT);
  return (stroops / STROOPS_PER_UNIT).toFixed(7);
}

export function isQuoteExpired(quote: MarketplaceQuote, now = Date.now()): boolean {
  return Date.parse(quote.expiresAt) <= now;
}

/** Human-friendly code for an asset string, e.g. `NGN:GABC…` → `NGN`. */
export function assetCode(value: string): string {
  return value === 'native' ? 'XLM' : (value.split(':')[0] ?? value);
}

/**
 * Convert the buyer's chosen asset into the listing currency, paid into the
 * buyer's own account, so the escrow order can then be placed as usual.
 *
 * The API's quote XDR pays the seller directly, which would bypass escrow, so
 * the conversion is built here from the quoted path instead.
 * @returns The transaction hash.
 */
export async function convertForCheckout(quote: MarketplaceQuote): Promise<string> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to continue.');
  }

  const horizon = new Horizon.Server(STELLAR_CONFIG.horizonUrl);
  const account = await horizon.loadAccount(publicKey);
  const networkPassphrase =
    STELLAR_CONFIG.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: parseAsset(quote.sourceAsset),
        sendMax: maxSendAmount(quote.sourceAmount),
        destination: publicKey,
        destAsset: parseAsset(quote.destinationAsset),
        destAmount: quote.destinationAmount,
        path: quote.path.map(parseAsset),
      }),
    )
    .setTimeout(120)
    .build();

  const signed = await signWithWallet(tx.toXDR());
  try {
    const result = await horizon.submitTransaction(
      TransactionBuilder.fromXDR(signed, networkPassphrase),
    );
    return result.hash;
  } catch {
    throw new Error(
      'The currency conversion failed. The price may have moved or your balance is too low.',
    );
  }
}
