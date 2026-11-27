'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Coins,
  Loader2,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { formatStroops } from '@/lib/amounts';
import { shortAddress } from '@/lib/batchVerification';
import {
  approveEmergencyWithdrawal,
  contributeToPool,
  daysUntilRoundEnd,
  fetchEmergencyRequest,
  fetchHasContributed,
  fetchNextRecipient,
  fetchSavingsPool,
  formatRoundEnd,
  nextRecipient,
  rememberRequest,
  rememberedRequest,
  requestEmergencyWithdrawal,
  rotation,
} from '@/lib/savings';
import { useWalletStore } from '@/store/useWalletStore';

export default function SavingsPoolPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { publicKey } = useWalletStore();
  const [contributing, setContributing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [amount, setAmount] = useState('');
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setRequestId(rememberedRequest(id) ?? '');
    }
  }, [id]);

  const poolQuery = useQuery({
    queryKey: ['savings-pool', id, publicKey],
    queryFn: () => fetchSavingsPool(id as string),
    enabled: Boolean(id && publicKey),
    retry: false,
  });
  const contributedQuery = useQuery({
    queryKey: ['savings-contributed', id, publicKey],
    queryFn: () => fetchHasContributed(id as string, publicKey as string),
    enabled: Boolean(id && publicKey),
    retry: false,
  });
  const recipientQuery = useQuery({
    queryKey: ['savings-recipient', id, publicKey],
    queryFn: () => fetchNextRecipient(id as string),
    enabled: Boolean(id && publicKey),
    retry: false,
  });
  const requestQuery = useQuery({
    queryKey: ['savings-request', id, requestId, publicKey],
    queryFn: () => fetchEmergencyRequest(id as string, requestId),
    enabled: Boolean(id && publicKey && requestId),
    retry: false,
  });

  const pool = poolQuery.data;
  const hasContributed = contributedQuery.data === true;
  const recipient = recipientQuery.data ?? (pool ? nextRecipient(pool) : null);

  async function invalidatePool() {
    await queryClient.invalidateQueries({ queryKey: ['savings-pool', id] });
    await queryClient.invalidateQueries({ queryKey: ['savings-contributed', id] });
  }

  async function handleContribute() {
    if (!pool) return;
    setContributing(true);
    setError(null);
    try {
      await contributeToPool(pool);
      toast('Contribution sent. The pot grows for this round.', 'success');
      await invalidatePool();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not contribute.';
      setError(message);
      toast(message, 'error');
    } finally {
      setContributing(false);
    }
  }

  async function handleEmergency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setRequesting(true);
    setError(null);
    try {
      const result = await requestEmergencyWithdrawal(id, amount);
      const newRequestId = result.value ?? '';
      if (newRequestId) {
        rememberRequest(id, newRequestId);
        setRequestId(newRequestId);
      }
      setAmount('');
      toast('Emergency request submitted. Members can now vote on it.', 'success');
      await invalidatePool();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not submit the request.';
      setError(message);
      toast(message, 'error');
    } finally {
      setRequesting(false);
    }
  }

  async function handleApprove() {
    if (!id || !requestId) return;
    setApproving(true);
    setError(null);
    try {
      await approveEmergencyWithdrawal(id, requestId);
      toast('Approval recorded.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['savings-request', id, requestId] });
      await invalidatePool();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not record the approval.';
      setError(message);
      toast(message, 'error');
    } finally {
      setApproving(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-8 py-24">
      <Link href="/savings" className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All pools
      </Link>

      {!publicKey && (
        <div className="card mt-6">
          <p className="text-sm text-text-2">Connect a wallet to open this pool.</p>
          <Link href="/login" className="btn-primary mt-3 inline-flex">
            Connect a wallet
          </Link>
        </div>
      )}

      {publicKey && poolQuery.isLoading && <p className="mt-8 text-text-2">Loading pool…</p>}
      {publicKey && poolQuery.isError && (
        <p className="mt-8 text-red-400">
          Could not load this pool. Check the id and the savings contract configuration.
        </p>
      )}

      {pool && (
        <article className="mt-6 space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-text-1">Pool #{pool.id}</h1>
            <p className="mt-1 text-xs text-text-3">
              Organised by {shortAddress(pool.organiser)} · {pool.members.length} members
            </p>
          </header>

          <section className="card">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-text-3">Contribution each round</dt>
                <dd className="mt-1 text-lg font-semibold text-text-1">
                  {formatStroops(pool.contribution)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-3">Pot this round</dt>
                <dd className="mt-1 text-lg font-semibold text-text-1">
                  {formatStroops(pool.pot)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-3">Round {pool.round + 1} ends</dt>
                <dd className="mt-1 text-sm text-text-1">
                  {formatRoundEnd(pool)}
                  {daysUntilRoundEnd(pool) > 0 && ` (${daysUntilRoundEnd(pool)} days)`}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <Coins className="h-4 w-4 text-text-3" aria-hidden /> Next payout
            </h2>
            <p className="mt-2 text-sm text-text-1">
              {recipient ? shortAddress(recipient) : '—'}
              {recipient === publicKey && (
                <span className="badge-green ml-2">Your turn</span>
              )}
            </p>
            <p className="mt-1 text-xs text-text-3">
              The whole pot goes to this member once everyone has contributed, or when the round
              ends.
            </p>

            <div className="mt-4">
              {hasContributed ? (
                <p className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  You have already contributed this round.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleContribute}
                  disabled={contributing}
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {contributing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {contributing
                    ? 'Contributing…'
                    : `Contribute ${formatStroops(pool.contribution)}`}
                </button>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </section>

          <section className="card">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <Users className="h-4 w-4 text-text-3" aria-hidden /> Members and rotation
            </h2>
            <ol className="mt-3 divide-y divide-white/5">
              {rotation(pool).map((seat) => (
                <li key={seat.member} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-text-1">
                    <span className="text-xs text-text-3">#{seat.paysOnRound + 1}</span>
                    {shortAddress(seat.member)}
                    {seat.member === publicKey && <span className="badge-muted">You</span>}
                  </span>
                  <span className="text-xs text-text-3">
                    {seat.member === recipient ? 'Next payout' : `Round ${seat.paysOnRound + 1}`}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <AlertTriangle className="h-4 w-4 text-text-3" aria-hidden /> Emergency withdrawal
            </h2>
            <p className="mt-1 text-xs text-text-3">
              A member can ask for part of the pot for a medical emergency. It is paid once more
              than half of the members approve.
            </p>

            <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleEmergency}>
              <label>
                <span className="text-xs text-text-3">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="input mt-1 w-40"
                  placeholder="0.00"
                  required
                />
              </label>
              <button
                type="submit"
                className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
                disabled={requesting || !amount}
              >
                {requesting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {requesting ? 'Submitting…' : 'Request withdrawal'}
              </button>
            </form>

            <div className="mt-6 border-t border-white/5 pt-4">
              <h3 className="text-sm font-semibold text-text-1">Vote on a request</h3>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label>
                  <span className="text-xs text-text-3">Request id</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={requestId}
                    onChange={(event) => setRequestId(event.target.value)}
                    className="input mt-1 w-32"
                    placeholder="1"
                  />
                </label>
              </div>

              {requestId && requestQuery.isLoading && (
                <p className="mt-3 text-sm text-text-2">Loading request…</p>
              )}
              {requestId && requestQuery.isError && (
                <p className="mt-3 text-sm text-red-400">No emergency request with that id.</p>
              )}
              {requestQuery.data && (
                <div className="mt-3 rounded-lg border border-white/10 p-4">
                  <p className="text-sm text-text-1">
                    {shortAddress(requestQuery.data.member)} asked for{' '}
                    {formatStroops(requestQuery.data.amount)}
                  </p>
                  <p className="mt-1 text-xs text-text-3">
                    {requestQuery.data.approvals} approval
                    {requestQuery.data.approvals === 1 ? '' : 's'}
                    {requestQuery.data.paid ? ' · already paid' : ''}
                  </p>
                  {requestQuery.data.paid ? (
                    <p className="mt-3 flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="h-4 w-4" aria-hidden /> This request has been paid.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approving}
                      className="btn-primary mt-3 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {approving ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <ThumbsUp className="h-4 w-4" aria-hidden />
                      )}
                      {approving ? 'Recording…' : 'Approve'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </article>
      )}
    </main>
  );
}
