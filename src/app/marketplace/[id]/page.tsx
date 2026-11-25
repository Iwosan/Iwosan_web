'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { placeOrder, type SubmitOrderResult } from '@/lib/marketplace';
import { fetchMarketplaceListing } from '@/services/api.service';
import { useWalletStore } from '@/store/useWalletStore';

const modeLabel = {
  sale: 'For sale',
  rental: 'For rent / day',
  hire: 'For hire / shift',
} as const;

const actionLabel = {
  sale: 'Buy now',
  rental: 'Rent now',
  hire: 'Hire now',
} as const;

const unitLabel = {
  sale: 'Quantity',
  rental: 'Days',
  hire: 'Days / shifts',
} as const;

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { toast } = useToast();
  const { publicKey } = useWalletStore();
  const [units, setUnits] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitOrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['marketplace-listing', id],
    queryFn: () => fetchMarketplaceListing(id as string),
    enabled: Boolean(id),
  });

  const maxUnits = listing?.mode === 'sale' ? Math.max(listing.stock, 0) : 99;
  const total = listing ? Number(listing.unitPrice) * units : 0;

  async function handlePlaceOrder() {
    if (!listing) return;
    setSubmitting(true);
    setError(null);
    try {
      const submitted = await placeOrder(listing, units);
      setResult(submitted);
      toast('Order placed — your payment is held in escrow.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not place the order.';
      setError(message);
      toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-5 sm:px-8 py-24">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden /> Back to marketplace
      </Link>

      {isLoading && <p className="mt-8 text-text-2">Loading listing…</p>}
      {isError && (
        <p className="mt-8 text-red-400">
          Could not load this listing. It may have been removed.
        </p>
      )}

      {listing && (
        <article className="mt-6 card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-text-1">{listing.title}</h1>
              <p className="mt-1 text-xs text-text-2">{modeLabel[listing.mode]}</p>
            </div>
            {listing.verified ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-500">
                <BadgeCheck className="w-5 h-5" aria-hidden /> Verified seller
              </span>
            ) : (
              <span className="badge-muted">Awaiting verification</span>
            )}
          </div>

          {listing.description && (
            <p className="mt-4 text-sm text-text-2 leading-relaxed">{listing.description}</p>
          )}

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-text-3">Price per unit</dt>
              <dd className="text-lg font-bold text-text-1">
                {listing.unitPrice} {listing.currency}
              </dd>
            </div>
            {listing.mode === 'sale' && (
              <div>
                <dt className="text-xs text-text-3">In stock</dt>
                <dd className="text-sm text-text-1">{listing.stock}</dd>
              </div>
            )}
            {listing.location && (
              <div>
                <dt className="text-xs text-text-3">Location</dt>
                <dd className="text-sm text-text-1">{listing.location}</dd>
              </div>
            )}
            {listing.regulatoryNumber && (
              <div>
                <dt className="text-xs text-text-3">Regulatory number</dt>
                <dd className="text-sm text-text-1">{listing.regulatoryNumber}</dd>
              </div>
            )}
          </dl>

          <hr className="my-6 border-white/10" />

          {!listing.verified && (
            <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
              This listing is still being verified. Drugs and personnel must be verified before they
              can be ordered.
            </p>
          )}

          {result ? (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-green-400">
                <CheckCircle2 className="w-4 h-4" aria-hidden /> Escrowed
              </p>
              <p className="mt-2 text-sm text-text-2">
                Your payment is held in Stellar escrow until you confirm delivery.
              </p>
              <p className="mt-2 break-all text-xs text-text-3">Transaction: {result.hash}</p>
              {result.orderId && (
                <p className="text-xs text-text-3">Order #{result.orderId}</p>
              )}
              <Link href="/orders" className="mt-3 inline-block text-sm text-green-400 underline">
                View my orders
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs text-text-3">{unitLabel[listing.mode]}</span>
                <input
                  type="number"
                  min={1}
                  max={maxUnits}
                  value={units}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setUnits(Number.isFinite(value) ? Math.min(Math.max(value, 1), maxUnits) : 1);
                  }}
                  className="mt-1 block w-32 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-text-1"
                />
              </label>

              <p className="text-sm text-text-2">
                Total:{' '}
                <span className="font-semibold text-text-1">
                  {total.toFixed(7).replace(/\.?0+$/, '')} {listing.currency}
                </span>
              </p>

              {error && <p className="text-sm text-red-400">{error}</p>}

              {!publicKey ? (
                <Link href="/login" className="btn-primary inline-flex">
                  Connect a wallet to continue
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submitting || !listing.verified || maxUnits === 0}
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                  {submitting ? 'Placing order…' : actionLabel[listing.mode]}
                </button>
              )}

              <p className="flex items-center gap-2 text-xs text-text-3">
                <ShieldCheck className="w-4 h-4" aria-hidden />
                Funds are held in Stellar escrow and only released when you confirm delivery.
              </p>
            </div>
          )}
        </article>
      )}
    </main>
  );
}
