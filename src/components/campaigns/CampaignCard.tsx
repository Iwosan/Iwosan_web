import Link from 'next/link';
import { BadgeCheck, CalendarDays } from 'lucide-react';
import CampaignProgressBar from '@/components/campaigns/CampaignProgressBar';
import { daysLeft, formatDeadline } from '@/lib/campaigns';
import type { TreatmentCampaign } from '@/services/campaigns.service';

/** One treatment campaign in the public list. */
export default function CampaignCard({ campaign }: { campaign: TreatmentCampaign }) {
  const remaining = daysLeft(campaign.deadline);

  return (
    <li className="card">
      <h2 className="font-semibold text-text-1">
        <Link href={`/campaigns/${campaign.id}`} className="hover:underline">
          {campaign.title}
        </Link>
      </h2>

      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-2">
        {campaign.hospitalVerified && (
          <BadgeCheck className="h-4 w-4 shrink-0 text-green-500" aria-label="Verified hospital" />
        )}
        <span>For {campaign.hospitalName}</span>
      </p>

      <div className="mt-4">
        <CampaignProgressBar
          goal={campaign.goal}
          raised={campaign.raised}
          currency={campaign.currency}
        />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-text-2">
        <CalendarDays className="h-4 w-4" aria-hidden />
        {remaining > 0 ? `${remaining} days left` : 'Closed'} — deadline {formatDeadline(campaign.deadline)}
      </p>
    </li>
  );
}
