'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Factory, Loader2, Truck } from 'lucide-react';
import BatchStatusBanner from '@/components/batches/BatchStatusBanner';
import { isValidBatchId, shortAddress } from '@/lib/batchVerification';
import type { ApiError } from '@/services/api.service';
import { fetchDrugBatch } from '@/services/batches.service';

const kindLabel = {
  orthodox_drug: 'Orthodox drug',
  native_drug: 'Native (traditional) drug',
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function VerifyBatchPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = params?.batchId ?? '';
  const validId = isValidBatchId(batchId);

  const {
    data: batch,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['drug-batch', batchId],
    queryFn: () => fetchDrugBatch(batchId),
    enabled: validId,
    retry: false,
  });
  const notFound = (error as ApiError | null)?.status === 404;

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-8 py-24">
      <Link
        href="/verify"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text-1"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden /> Scan another pack
      </Link>

      <h1 className="mt-6 text-2xl font-bold text-text-1">Drug batch check</h1>

      {!validId && (
        <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          This is not a valid batch code. Scan the QR code on the pack again.
        </p>
      )}

      {validId && isLoading && (
        <p className="mt-6 flex items-center gap-2 text-text-2">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Checking the batch on Stellar…
        </p>
      )}

      {notFound && (
        <div className="mt-6 rounded-lg border border-red-500/50 bg-red-500/15 p-4 text-red-300">
          <p className="text-lg font-bold">Not registered</p>
          <p className="mt-1 text-sm">
            No manufacturer has registered this batch. It may be counterfeit — do not use it and
            report it to the seller or NAFDAC.
          </p>
        </div>
      )}

      {error && !notFound && (
        <p className="mt-6 text-sm text-red-400">
          Could not check this batch right now. Please try again shortly.
        </p>
      )}

      {batch && (
        <article className="mt-6 space-y-6">
          <BatchStatusBanner status={batch.status} />

          <dl className="card grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-text-3">Product</dt>
              <dd className="font-semibold text-text-1">{batch.product}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-3">Type</dt>
              <dd className="text-sm text-text-1">{kindLabel[batch.kind]}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-3">Regulatory number</dt>
              <dd className="text-sm text-text-1">{batch.regulatoryNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-3">Expires</dt>
              <dd className={`text-sm ${batch.expired ? 'text-amber-300' : 'text-text-1'}`}>
                {formatDate(batch.expiresAt)}
                {batch.expired && ' (expired)'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-text-3">Manufacturer</dt>
              <dd className="break-all text-sm text-text-1">{batch.manufacturer}</dd>
            </div>
          </dl>

          <section>
            <h2 className="text-sm font-semibold text-text-1">Custody chain</h2>
            <ol className="mt-3 space-y-3 border-l border-white/10 pl-5">
              {batch.history.map((step, index) => (
                <li key={`${step.to}-${step.at}`} className="relative">
                  <span
                    className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface-base"
                    aria-hidden
                  >
                    {index === 0 ? (
                      <Factory className="w-3.5 h-3.5 text-text-2" />
                    ) : (
                      <Truck className="w-3.5 h-3.5 text-text-2" />
                    )}
                  </span>
                  <p className="text-sm text-text-1">
                    {step.from
                      ? `${shortAddress(step.from)} → ${shortAddress(step.to)}`
                      : `Registered by ${shortAddress(step.to)}`}
                  </p>
                  <p className="text-xs text-text-3">{formatDate(step.at)}</p>
                </li>
              ))}
            </ol>
          </section>
        </article>
      )}
    </main>
  );
}
