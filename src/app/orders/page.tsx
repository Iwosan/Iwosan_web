'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { confirmOrder, refundOrder } from '@/lib/marketplace';
import {
  fetchMarketplaceOrders,
  openOrderDispute,
  type ApiError,
  type MarketplaceOrder,
} from '@/services/api.service';
import { useWalletStore } from '@/store/useWalletStore';

const statusStyles: Record<MarketplaceOrder['status'], string> = {
  escrowed: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  released: 'bg-green-500/10 text-green-400 border-green-500/30',
  refunded: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
};

const statusLabel: Record<MarketplaceOrder['status'], string> = {
  escrowed: 'Escrowed',
  released: 'Released',
  refunded: 'Refunded',
};

interface OrderRow {
  order: MarketplaceOrder;
  side: 'buyer' | 'seller';
}

export default function OrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { publicKey } = useWalletStore();
  const [pending, setPending] = useState<string | null>(null);

  const buyerQuery = useQuery({
    queryKey: ['marketplace-orders', 'buyer'],
    queryFn: () => fetchMarketplaceOrders('buyer'),
    enabled: Boolean(publicKey),
  });
  const sellerQuery = useQuery({
    queryKey: ['marketplace-orders', 'seller'],
    queryFn: () => fetchMarketplaceOrders('seller'),
    enabled: Boolean(publicKey),
  });

  const error = (buyerQuery.error ?? sellerQuery.error) as ApiError | null;
  const isLoading = buyerQuery.isLoading || sellerQuery.isLoading;

  const rows: OrderRow[] = [];
  const seen = new Set<string>();
  for (const order of buyerQuery.data ?? []) {
    seen.add(order.id);
    rows.push({ order, side: 'buyer' });
  }
  for (const order of sellerQuery.data ?? []) {
    if (!seen.has(order.id)) {
      rows.push({ order, side: 'seller' });
    }
  }
  rows.sort((a, b) => (a.order.createdAt < b.order.createdAt ? 1 : -1));

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
  }

  async function runAction(
    key: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) {
    setPending(key);
    try {
      await action();
      toast(successMessage, 'success');
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'The action failed.', 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-8 py-24">
      <h1 className="text-3xl font-bold text-text-1">My orders</h1>
      <p className="mt-2 text-text-2 max-w-2xl">
        Orders you bought and sold through Iwosan escrow. Confirm delivery to release funds, refund a
        buyer, or open a dispute for the Iwosan team to resolve.
      </p>

      {!publicKey && (
        <p className="mt-8 text-text-2">
          <Link href="/login" className="underline">
            Connect a wallet
          </Link>{' '}
          to see your orders.
        </p>
      )}

      {publicKey && isLoading && <p className="mt-8 text-text-2">Loading orders…</p>}

      {publicKey && error && (
        <p className="mt-8 text-red-400">
          {error.status === 401
            ? 'Please sign in again to view your orders.'
            : 'Could not load your orders. Try again later.'}
        </p>
      )}

      {publicKey && !isLoading && !error && rows.length === 0 && (
        <p className="mt-8 text-text-2">
          No orders yet.{' '}
          <Link href="/marketplace" className="underline">
            Browse the marketplace
          </Link>
          .
        </p>
      )}

      <ul className="mt-8 space-y-4">
        {rows.map(({ order, side }) => {
          const key = `${side}-${order.id}`;
          const busy = pending === key;
          const open = order.status === 'escrowed';
          const listing = order.listing;

          return (
            <li key={key} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-text-1">
                    {listing?.title ?? `Order #${order.onChainOrderId}`}
                  </h2>
                  <p className="mt-1 text-xs text-text-2">
                    You are the {side} · {order.units} unit{order.units === 1 ? '' : 's'} · Order #
                    {order.onChainOrderId}
                  </p>
                  <p className="mt-1 text-sm text-text-1">
                    {order.amount} {order.currency}
                  </p>
                  {order.paidAt && (
                    <p className="text-xs text-green-400">Cross-border payment received</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[order.status]}`}
                  >
                    {statusLabel[order.status]}
                  </span>
                  {order.disputed && (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-300">
                      Disputed
                    </span>
                  )}
                </div>
              </div>

              {order.txHash && (
                <p className="mt-3 break-all text-xs text-text-3">Transaction: {order.txHash}</p>
              )}

              {open && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {side === 'buyer' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          key,
                          () => confirmOrder(order),
                          'Delivery confirmed — escrow released to the seller.',
                        )
                      }
                      className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" aria-hidden />
                      )}
                      Confirm delivery
                    </button>
                  )}

                  {side === 'seller' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          key,
                          () => refundOrder(order),
                          'Order refunded — escrow returned to the buyer.',
                        )
                      }
                      className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      ) : (
                        <RotateCcw className="w-4 h-4" aria-hidden />
                      )}
                      Refund buyer
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busy || order.disputed}
                    onClick={() =>
                      runAction(
                        `${key}-dispute`,
                        () => openOrderDispute(order.id),
                        'Dispute opened — the Iwosan team will review this order.',
                      )
                    }
                    className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <AlertTriangle className="w-4 h-4" aria-hidden />
                    {order.disputed ? 'Dispute opened' : 'Open dispute'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
