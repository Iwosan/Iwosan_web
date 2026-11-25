'use client';

import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import {
  ANCHOR_ASSET_CODE,
  ANCHOR_HOME_DOMAIN,
  openAnchorPopup,
  startCashFlow,
} from '@/lib/anchor';
import type { AnchorDirection } from '@/services/anchor.service';
import { useAnchorStore } from '@/store/useAnchorStore';

const directionLabel: Record<AnchorDirection, string> = {
  deposit: 'Add money',
  withdraw: 'Cash out',
};

/**
 * Cash in and cash out through a SEP-24 anchor: local agents, MoneyGram or
 * bank transfer, depending on what the anchor supports.
 */
export default function CashInOut({ account }: { account: string }) {
  const { toast } = useToast();
  const { activity, record } = useAnchorStore();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState<AnchorDirection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);

  async function start(direction: AnchorDirection) {
    setBusy(direction);
    setError(null);
    setBlockedUrl(null);
    try {
      const interaction = await startCashFlow(direction, account, amount || undefined);
      record(interaction, { account, amount: amount || null, assetCode: ANCHOR_ASSET_CODE });
      if (!openAnchorPopup(interaction.url)) {
        setBlockedUrl(interaction.url);
      }
      toast(`${directionLabel[direction]} started with ${ANCHOR_HOME_DOMAIN}.`, 'success');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : ((err as { message?: string })?.message ?? 'Could not reach the anchor.');
      setError(message);
      toast(message, 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-1">Cash in / cash out</h2>
        <p className="mt-1 text-sm text-text-2">
          Turn cash into {ANCHOR_ASSET_CODE} in your wallet, or {ANCHOR_ASSET_CODE} back into cash,
          through {ANCHOR_HOME_DOMAIN}. You will be asked to sign in with your wallet.
        </p>
      </div>

      <label className="block">
        <span className="text-xs text-text-3">Amount ({ANCHOR_ASSET_CODE}, optional)</span>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="mt-1 block w-40 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-text-1"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {(['deposit', 'withdraw'] as const).map((direction) => (
          <button
            key={direction}
            type="button"
            onClick={() => void start(direction)}
            disabled={busy !== null}
            className={`${direction === 'deposit' ? 'btn-primary' : 'btn-secondary'} inline-flex items-center gap-2 disabled:opacity-50`}
          >
            {busy === direction ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : direction === 'deposit' ? (
              <ArrowDownToLine className="w-4 h-4" aria-hidden />
            ) : (
              <ArrowUpFromLine className="w-4 h-4" aria-hidden />
            )}
            {directionLabel[direction]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {blockedUrl && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          Your browser blocked the anchor window.{' '}
          <a
            href={blockedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            Open it in a new tab <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </a>
        </p>
      )}

      <div>
        <h3 className="text-sm font-semibold text-text-1">Recent requests</h3>
        {activity.length === 0 ? (
          <p className="mt-2 text-sm text-text-3">No cash-in or cash-out requests yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/5">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-text-1">
                  {directionLabel[entry.direction]}
                  {entry.amount && ` · ${entry.amount} ${entry.assetCode}`}
                  <span className="block text-xs text-text-3">
                    {new Date(entry.startedAt).toLocaleString()}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="badge-muted">{entry.status.replace(/_/g, ' ')}</span>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-400 underline"
                  >
                    Continue
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
