'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2, PiggyBank, PlusCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { formatStroops } from '@/lib/amounts';
import { shortAddress } from '@/lib/batchVerification';
import {
  createSavingsPool,
  fetchSavingsPool,
  formatRoundEnd,
  rememberPool,
  rememberedPools,
  rotation,
} from '@/lib/savings';
import { useWalletStore } from '@/store/useWalletStore';

const ADDRESS_PATTERN = /^G[A-Z0-9]{55}$/;

export default function SavingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { publicKey } = useWalletStore();
  const [poolIds, setPoolIds] = useState<string[]>([]);
  const [openId, setOpenId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    token: '',
    contribution: '',
    periodDays: '30',
    members: '',
  });

  useEffect(() => {
    setPoolIds(rememberedPools());
  }, [publicKey]);

  const poolsQuery = useQuery({
    queryKey: ['savings-pools', poolIds, publicKey],
    queryFn: () => Promise.all(poolIds.map((poolId) => fetchSavingsPool(poolId))),
    enabled: Boolean(publicKey) && poolIds.length > 0,
    retry: false,
  });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const members = form.members
      .split(/[\s,]+/)
      .map((member) => member.trim())
      .filter(Boolean);
    const invalid = members.find((member) => !ADDRESS_PATTERN.test(member));
    if (invalid) {
      setError(`${invalid} is not a valid Stellar account.`);
      return;
    }
    if (!ADDRESS_PATTERN.test(form.token.trim())) {
      setError('Enter the token contract address the pool is funded in.');
      return;
    }

    setCreating(true);
    try {
      const result = await createSavingsPool({
        token: form.token.trim(),
        contribution: form.contribution,
        periodDays: Number(form.periodDays),
        members,
      });
      if (!result.value) {
        throw new Error('The pool was created but its id could not be read.');
      }
      rememberPool(result.value);
      toast(`Pool #${result.value} created.`, 'success');
      router.push(`/savings/${result.value}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create the pool.';
      setError(message);
      toast(message, 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-8 py-24">
      <header>
        <h1 className="text-3xl font-bold text-text-1">Health savings pools</h1>
        <p className="mt-2 max-w-2xl text-text-2">
          Save together, ajo/esusu style: every member contributes each period and the pot rotates
          to the next member in turn. A majority vote can release part of the pot early for a
          medical emergency.
        </p>
      </header>

      {!publicKey ? (
        <div className="card mt-8">
          <p className="text-sm text-text-2">Connect a wallet to see and join savings pools.</p>
          <Link href="/login" className="btn-primary mt-3 inline-flex">
            Connect a wallet
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <PiggyBank className="h-4 w-4 text-text-3" aria-hidden /> Your pools
            </h2>

            {poolIds.length === 0 && (
              <p className="mt-3 text-sm text-text-2">
                No pools in this browser yet. Create one below or open a pool by its id.
              </p>
            )}
            {poolsQuery.isLoading && <p className="mt-3 text-sm text-text-2">Loading pools…</p>}
            {poolsQuery.isError && (
              <p className="mt-3 text-sm text-red-400">
                Could not load your pools. Check the contract configuration and try again.
              </p>
            )}

            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {(poolsQuery.data ?? []).map((pool) => {
                const next = rotation(pool).find(
                  (seat) => seat.paysOnRound === pool.round % pool.members.length,
                );
                return (
                  <li key={pool.id} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-text-1">Pool #{pool.id}</h3>
                        <p className="mt-1 text-xs text-text-3">
                          Round {pool.round + 1} · {pool.members.length} members
                        </p>
                      </div>
                      <span className="badge-green">{formatStroops(pool.contribution)}</span>
                    </div>
                    <dl className="mt-3 space-y-1 text-sm text-text-2">
                      <div className="flex justify-between gap-3">
                        <dt>Pot this round</dt>
                        <dd className="text-text-1">{formatStroops(pool.pot)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Next payout</dt>
                        <dd className="text-text-1">
                          {next ? shortAddress(next.member) : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Round ends</dt>
                        <dd className="text-text-1">{formatRoundEnd(pool)}</dd>
                      </div>
                    </dl>
                    <Link
                      href={`/savings/${pool.id}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Open pool <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <form
              className="mt-4 flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const id = openId.trim();
                if (id) router.push(`/savings/${id}`);
              }}
            >
              <label>
                <span className="text-xs text-text-3">Open a pool by id</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={openId}
                  onChange={(event) => setOpenId(event.target.value)}
                  className="input mt-1 w-40"
                  placeholder="1"
                />
              </label>
              <button type="submit" className="btn-secondary" disabled={!openId.trim()}>
                Open
              </button>
            </form>
          </section>

          <section className="card mt-10">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <PlusCircle className="h-4 w-4 text-text-3" aria-hidden /> Create a pool
            </h2>
            <p className="mt-1 text-xs text-text-3">
              You are added as the organiser and first member. Members are paid in the order you
              list them, starting with you.
            </p>

            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
              <label className="sm:col-span-2">
                <span className="text-xs text-text-3">Token contract address</span>
                <input
                  type="text"
                  value={form.token}
                  onChange={(event) => setForm({ ...form, token: event.target.value })}
                  className="input mt-1 w-full"
                  placeholder="C… (USDC SAC)"
                  required
                />
              </label>
              <label>
                <span className="text-xs text-text-3">Contribution per round</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.contribution}
                  onChange={(event) => setForm({ ...form, contribution: event.target.value })}
                  className="input mt-1 w-full"
                  placeholder="50"
                  required
                />
              </label>
              <label>
                <span className="text-xs text-text-3">Round length (days)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.periodDays}
                  onChange={(event) => setForm({ ...form, periodDays: event.target.value })}
                  className="input mt-1 w-full"
                  required
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs text-text-3">Other members (one Stellar account each)</span>
                <textarea
                  value={form.members}
                  onChange={(event) => setForm({ ...form, members: event.target.value })}
                  className="input mt-1 w-full"
                  rows={3}
                  placeholder={'G…\nG…'}
                />
              </label>

              {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                  disabled={creating}
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {creating ? 'Creating…' : 'Create pool'}
                </button>
              </div>
            </form>
          </section>

          <p className="mt-6 flex items-start gap-2 text-xs text-text-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Pools are stored on Stellar. This browser remembers the pools you open so you can
            return to them.
          </p>
        </>
      )}
    </main>
  );
}
