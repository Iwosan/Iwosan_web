'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import CampaignProgressBar from '@/components/campaigns/CampaignProgressBar';
import CampaignStatusBanner from '@/components/campaigns/CampaignStatusBanner';
import { useToast } from '@/hooks/useToast';
import { shortAddress } from '@/lib/batchVerification';
import { campaignPhase, daysLeft, donateToCampaign, formatDeadline } from '@/lib/campaigns';
import type { ApiError } from '@/services/api.service';
import { fetchCampaign } from '@/services/campaigns.service';
import { useWalletStore } from '@/store/useWalletStore';

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { publicKey } = useWalletStore();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data: campaign,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => fetchCampaign(id as string),
    enabled: Boolean(id),
    retry: false,
  });
  const notFound = (queryError as ApiError | null)?.status === 404;

  const phase = campaign ? campaignPhase(campaign) : null;
  const acceptingDonations = phase === 'open';

  async function handleDonate() {
    if (!campaign) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await donateToCampaign(campaign, amount);
      setTxHash(result.hash);
      setAmount('');
      toast('Donation sent. The hospital receives it when treatment is confirmed.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the donation.';
      setError(message);
      toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-8 py-24">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All campaigns
      </Link>

      {isLoading && <p className="mt-8 text-text-2">Loading campaign…</p>}
      {notFound && (
        <p className="mt-8 text-red-400">This campaign does not exist or has been removed.</p>
      )}
      {queryError && !notFound && (
        <p className="mt-8 text-red-400">Could not load this campaign. Try again shortly.</p>
      )}

      {campaign && phase && (
        <article className="mt-6 space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-text-1">{campaign.title}</h1>
            <p className="mt-1 text-xs text-text-3">
              Started by {shortAddress(campaign.patientAddress)}
            </p>
          </header>

          <CampaignStatusBanner phase={phase} />

          <section className="card">
            <CampaignProgressBar
              goal={campaign.goal}
              raised={campaign.raised}
              currency={campaign.currency}
            />
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 text-text-3" aria-hidden />
                <div>
                  <dt className="text-xs text-text-3">Deadline</dt>
                  <dd className="text-sm text-text-1">
                    {formatDeadline(campaign.deadline)}
                    {daysLeft(campaign.deadline) > 0 &&
                      ` (${daysLeft(campaign.deadline)} days left)`}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 text-text-3" aria-hidden />
                <div>
                  <dt className="text-xs text-text-3">Donors</dt>
                  <dd className="text-sm text-text-1">{campaign.donorCount}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="card">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <Building2 className="h-4 w-4 text-text-3" aria-hidden /> Funds go to the hospital
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-text-1">
              {campaign.hospitalName}
              {campaign.hospitalVerified ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-500">
                  <BadgeCheck className="h-4 w-4" aria-hidden /> Verified hospital
                </span>
              ) : (
                <span className="badge-yellow">Not verified yet</span>
              )}
            </p>
            <p className="mt-1 break-all text-xs text-text-3">{campaign.hospitalAddress}</p>
            <p className="mt-3 flex items-start gap-2 text-xs text-text-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Donations are escrowed by the treatment-crowdfund contract and released to the
              hospital only. The patient never receives the money.
            </p>
          </section>

          {campaign.story && (
            <section>
              <h2 className="text-sm font-semibold text-text-1">The story</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-2">
                {campaign.story}
              </p>
            </section>
          )}

          <section className="card">
            <h2 className="text-sm font-semibold text-text-1">Donate</h2>

            {txHash ? (
              <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-green-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Thank you
                </p>
                <p className="mt-2 text-sm text-text-2">
                  Your donation is held in escrow for {campaign.hospitalName}.
                </p>
                <p className="mt-2 break-all text-xs text-text-3">Transaction: {txHash}</p>
              </div>
            ) : acceptingDonations ? (
              <>
                <label className="mt-3 block">
                  <span className="text-xs text-text-3">Amount ({campaign.currency})</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="input mt-1 w-full max-w-xs"
                    placeholder="0.00"
                  />
                </label>

                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

                {publicKey ? (
                  <button
                    type="button"
                    onClick={handleDonate}
                    disabled={submitting || !amount || Number(amount) <= 0}
                    className="btn-primary mt-3 inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {submitting ? 'Sending…' : 'Donate'}
                  </button>
                ) : (
                  <Link href="/login" className="btn-primary mt-3 inline-flex">
                    Connect a wallet to donate
                  </Link>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-text-2">
                This campaign is no longer accepting donations.
              </p>
            )}
          </section>
        </article>
      )}
    </main>
  );
}
