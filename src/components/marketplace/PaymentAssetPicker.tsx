'use client';

import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import type { MarketplaceQuote } from '@/services/api.service';
import { PAYMENT_ASSETS, SLIPPAGE, assetCode, maxSendAmount } from '@/lib/pathPayment';

interface PaymentAssetPickerProps {
  /** Currency the listing is priced in; paying with it needs no conversion. */
  listingCurrency: string;
  value: string;
  onChange: (code: string) => void;
  quote?: MarketplaceQuote | undefined;
  quoteLoading: boolean;
  quoteError: string | null;
}

/** Lets the buyer choose the asset they pay with and shows the live conversion quote. */
export default function PaymentAssetPicker({
  listingCurrency,
  value,
  onChange,
  quote,
  quoteLoading,
  quoteError,
}: PaymentAssetPickerProps) {
  const converting = value !== listingCurrency;

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs text-text-3">Pay with</legend>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_ASSETS.map((asset) => (
          <label
            key={asset.code}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
              value === asset.code
                ? 'border-green-500 text-text-1'
                : 'border-white/10 text-text-2 hover:text-text-1'
            }`}
          >
            <input
              type="radio"
              name="payment-asset"
              value={asset.code}
              checked={value === asset.code}
              onChange={() => onChange(asset.code)}
              className="sr-only"
            />
            {asset.label}
          </label>
        ))}
      </div>

      {converting && (
        <div className="rounded-lg border border-white/10 p-3 text-sm" aria-live="polite">
          {quoteLoading && !quote && (
            <p className="flex items-center gap-2 text-text-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Getting the best rate…
            </p>
          )}
          {quoteError && <p className="text-red-400">{quoteError}</p>}
          {quote && !quoteError && (
            <>
              <p className="text-text-1">
                You pay about{' '}
                <span className="font-semibold">
                  {quote.sourceAmount} {assetCode(quote.sourceAsset)}
                </span>
              </p>
              <p className="mt-1 text-xs text-text-3">
                Converted to {quote.destinationAmount} {assetCode(quote.destinationAsset)} in your
                wallet first, then held in escrow.
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-300">
                <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0" aria-hidden />
                Rates move. You will pay at most {maxSendAmount(quote.sourceAmount)}{' '}
                {assetCode(quote.sourceAsset)} ({SLIPPAGE * 100}% slippage protection).
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-text-3">
                <RefreshCw className="w-3 h-3" aria-hidden /> The rate refreshes every 30 seconds.
              </p>
            </>
          )}
        </div>
      )}
    </fieldset>
  );
}
