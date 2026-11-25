'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Leaf, Pill, Search, Stethoscope, UserRound } from 'lucide-react';
import {
  fetchMarketplaceListings,
  type ListingKind,
  type MarketplaceListing,
} from '@/services/api.service';

const categories: { kind?: ListingKind; label: string; icon: typeof Pill }[] = [
  { label: 'All', icon: Search },
  { kind: 'equipment', label: 'Medical equipment', icon: Stethoscope },
  { kind: 'orthodox_drug', label: 'Orthodox drugs', icon: Pill },
  { kind: 'native_drug', label: 'Native drugs', icon: Leaf },
  { kind: 'personnel', label: 'Medical personnel', icon: UserRound },
];

const modeLabel: Record<MarketplaceListing['mode'], string> = {
  sale: 'For sale',
  rental: 'For rent / day',
  hire: 'For hire / shift',
};

export default function MarketplacePage() {
  const [kind, setKind] = useState<ListingKind | undefined>();
  const [search, setSearch] = useState('');

  const { data: listings = [], isLoading, isError } = useQuery({
    queryKey: ['marketplace', kind, search],
    queryFn: () =>
      fetchMarketplaceListings({
        ...(kind ? { kind } : {}),
        ...(search ? { search } : {}),
      }),
  });

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 py-24">
      <h1 className="text-3xl font-bold text-text-1">Iwosan Marketplace</h1>
      <p className="mt-2 text-text-2 max-w-2xl">
        Buy or rent medical equipment, order verified orthodox and native drugs, and hire licensed
        medical personnel. Payments are held in Stellar escrow until you confirm delivery.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={kind === k ? 'btn-primary' : 'btn-secondary'}
          >
            <Icon className="w-4 h-4 inline mr-1.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Search listings</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search e.g. wheelchair, paracetamol, agbo, nurse"
          className="w-full max-w-md rounded-lg px-3 py-2 bg-transparent border border-white/10 text-text-1"
        />
      </label>

      {isLoading && <p className="mt-8 text-text-2">Loading listings…</p>}
      {isError && <p className="mt-8 text-red-400">Could not load listings. Try again later.</p>}
      {!isLoading && !isError && listings.length === 0 && (
        <p className="mt-8 text-text-2">No listings found.</p>
      )}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <li key={listing.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-text-1">
                <Link href={`/marketplace/${listing.id}`} className="hover:underline">
                  {listing.title}
                </Link>
              </h2>
              {listing.verified && (
                <BadgeCheck className="w-5 h-5 shrink-0 text-green-500" aria-label="Verified" />
              )}
            </div>
            <p className="mt-1 text-xs text-text-2">{modeLabel[listing.mode]}</p>
            {listing.description && (
              <p className="mt-3 text-sm text-text-2 line-clamp-3">{listing.description}</p>
            )}
            <p className="mt-4 text-lg font-bold text-text-1">
              {listing.unitPrice} {listing.currency}
            </p>
            {listing.location && <p className="text-xs text-text-2">{listing.location}</p>}
            {listing.regulatoryNumber && (
              <p className="text-xs text-text-2">Reg. no: {listing.regulatoryNumber}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
