'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { createCampaign, fetchCampaignHospitals } from '@/services/campaigns.service';
import { useWalletStore } from '@/store/useWalletStore';

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { publicKey } = useWalletStore();
  const [title, setTitle] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [story, setStory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: hospitals = [],
    isLoading: hospitalsLoading,
    isError: hospitalsError,
  } = useQuery({
    queryKey: ['campaign-hospitals'],
    queryFn: fetchCampaignHospitals,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await createCampaign({ title, hospitalAddress, goal, deadline, story });
      toast('Campaign created.', 'success');
      router.push(`/campaigns/${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create the campaign.';
      setError(message);
      toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!publicKey) {
    return (
      <main className="max-w-2xl mx-auto px-5 sm:px-8 py-24">
        <h1 className="text-2xl font-bold text-text-1">Start a treatment campaign</h1>
        <p className="mt-3 text-text-2">
          Connect your wallet to raise funds for your treatment. Only the patient can start a
          campaign, and the money goes straight to the hospital.
        </p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">
          Connect a wallet
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-8 py-24">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All campaigns
      </Link>

      <h1 className="mt-6 text-2xl font-bold text-text-1">Start a treatment campaign</h1>
      <p className="mt-2 text-sm text-text-2">
        Choose the hospital that will treat you. Donations are paid to that hospital only — never to
        you.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs text-text-3">Campaign title</span>
          <input
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Help me pay for a kidney transplant"
            className="input mt-1 w-full"
          />
        </label>

        <label className="block">
          <span className="text-xs text-text-3">Verified hospital</span>
          <select
            required
            value={hospitalAddress}
            onChange={(event) => setHospitalAddress(event.target.value)}
            className="input mt-1 w-full"
            disabled={hospitalsLoading || hospitals.length === 0}
          >
            <option value="">
              {hospitalsLoading ? 'Loading hospitals…' : 'Select a hospital'}
            </option>
            {hospitals.map((hospital) => (
              <option key={hospital.address} value={hospital.address}>
                {hospital.name}
                {hospital.city ? ` — ${hospital.city}` : ''}
              </option>
            ))}
          </select>
          {hospitalsError && (
            <span className="mt-1 block text-xs text-red-400">
              Could not load verified hospitals. Try again later.
            </span>
          )}
          {!hospitalsLoading && !hospitalsError && hospitals.length === 0 && (
            <span className="mt-1 block text-xs text-text-3">
              No verified hospitals are available yet.
            </span>
          )}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-text-3">Goal (USDC)</span>
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className="input mt-1 w-full"
              placeholder="2500"
            />
          </label>

          <label className="block">
            <span className="text-xs text-text-3">Deadline</span>
            <input
              required
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="input mt-1 w-full"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-text-3">Your story</span>
          <textarea
            required
            rows={5}
            value={story}
            onChange={(event) => setStory(event.target.value)}
            placeholder="Explain your diagnosis, the treatment you need and how the funds will help."
            className="input mt-1 w-full"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <p className="flex items-start gap-2 text-xs text-text-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Donations are escrowed by the treatment-crowdfund contract. If the goal is not reached by
          the deadline, donors get their money back.
        </p>

        <button
          type="submit"
          disabled={submitting || hospitals.length === 0}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitting ? 'Creating…' : 'Create campaign'}
        </button>
      </form>
    </main>
  );
}
