import { AlertOctagon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { statusBanner } from '@/lib/batchVerification';
import type { BatchStatus } from '@/services/batches.service';

const toneStyles = {
  danger: 'border-red-500/50 bg-red-500/15 text-red-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
} as const;

const toneIcons = {
  danger: AlertOctagon,
  warning: AlertTriangle,
  success: ShieldCheck,
} as const;

/** Status of a scanned batch, shown as text as well as colour. */
export default function BatchStatusBanner({ status }: { status: BatchStatus }) {
  const banner = statusBanner({ status });
  const Icon = toneIcons[banner.tone];

  return (
    <div role="status" className={`rounded-lg border p-4 ${toneStyles[banner.tone]}`}>
      <p className="flex items-center gap-2 text-lg font-bold">
        <Icon className="w-5 h-5 shrink-0" aria-hidden />
        {banner.title}
      </p>
      <p className="mt-1 text-sm">{banner.message}</p>
    </div>
  );
}
