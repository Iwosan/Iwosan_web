'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { HeartHandshake, PlusCircle } from 'lucide-react';
import CampaignCard from '@/components/campaigns/CampaignCard';
import { fetchCampaigns } from '@/services/campaigns.service';

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading, isError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
  });

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 py-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-1">Treatment campaigns</h1>
          <p className="mt-2 max-w-2xl text-text-2">
            Help patients pay for surgery and treatment. Donations are held in Stellar escrow and
            paid directly to the hospital, never to the patient.
          </p>
        </div>
        <Link href="/campaigns/new" className="btn-primary inline-flex items-center gap-2">
          <PlusCircle className="h-4 w-4" aria-hidden /> Start a campaign
        </Link>
      </div>

      {isLoading && <p className="mt-8 text-text-2">Loading campaigns…</p>}
      {isError && (
        <p className="mt-8 text-red-400">Could not load campaigns. Try again later.</p>
      )}
      {!isLoading && !isError && campaigns.length === 0 && (
        <p className="mt-8 flex items-center gap-2 text-text-2">
          <HeartHandshake className="h-4 w-4" aria-hidden /> No campaigns yet. Be the first to
          start one.
        </p>
      )}

      {campaigns.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </ul>
      )}
    </main>
  );
}
