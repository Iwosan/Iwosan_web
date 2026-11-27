import { phaseNotice, type CampaignPhase } from '@/lib/campaigns';

const TONES: Record<'info' | 'success' | 'warning', string> = {
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  success: 'border-green-500/30 bg-green-500/10 text-green-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
};

/** Current state of the campaign: open, goal reached, released or refundable. */
export default function CampaignStatusBanner({ phase }: { phase: CampaignPhase }) {
  const notice = phaseNotice(phase);

  return (
    <div role="status" className={`rounded-lg border p-4 text-sm ${TONES[notice.tone]}`}>
      <p className="font-semibold">{notice.title}</p>
      <p className="mt-1">{notice.message}</p>
    </div>
  );
}
