import { campaignProgress } from '@/lib/campaigns';

interface CampaignProgressBarProps {
  goal: string;
  raised: string;
  currency: string;
}

/** Fundraising progress with a text equivalent, so it is not colour-only. */
export default function CampaignProgressBar({ goal, raised, currency }: CampaignProgressBarProps) {
  const { percent } = campaignProgress({ goal, raised });

  return (
    <div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Campaign progress"
      >
        <div className="h-full rounded-full bg-green-500" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-sm text-text-2">
        <span className="font-semibold text-text-1">
          {raised} {currency}
        </span>{' '}
        raised of {goal} {currency} ({percent}%)
      </p>
    </div>
  );
}
