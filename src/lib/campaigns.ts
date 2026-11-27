import { Address, nativeToScVal } from '@stellar/stellar-sdk';
import { toStroops } from '@/lib/amounts';
import { submitContractCall, type ContractCallResult } from '@/lib/soroban';
import type { TreatmentCampaign } from '@/services/campaigns.service';
import { useWalletStore } from '@/store/useWalletStore';

const CROWDFUND_CONTRACT_ID = process.env.NEXT_PUBLIC_CROWDFUND_CONTRACT_ID || '';

export { toStroops };

/** What the campaign page should show, derived from funds and deadline. */
export type CampaignPhase = 'open' | 'goal-reached' | 'refundable' | 'released' | 'refunded';

export interface CampaignProgress {
  /** 0–100, capped at 100. */
  percent: number;
  /** Amount still needed to reach the goal, as a decimal string. */
  remaining: string;
  funded: boolean;
}

export interface PhaseNotice {
  tone: 'info' | 'success' | 'warning';
  title: string;
  message: string;
}

export function campaignProgress(
  campaign: Pick<TreatmentCampaign, 'goal' | 'raised'>,
): CampaignProgress {
  const goal = Number(campaign.goal);
  const raised = Number(campaign.raised);
  if (!Number.isFinite(goal) || goal <= 0) {
    return { percent: 0, remaining: campaign.goal, funded: false };
  }

  const safeRaised = Number.isFinite(raised) && raised > 0 ? raised : 0;
  const funded = safeRaised >= goal;
  const percent = Math.min(100, Math.max(0, Math.round((safeRaised / goal) * 100)));
  const remaining = Math.max(0, goal - safeRaised);

  return {
    percent,
    remaining: remaining.toFixed(7).replace(/0+$/, '').replace(/\.$/, ''),
    funded,
  };
}

export function isDeadlinePassed(deadline: string, now: number = Date.now()): boolean {
  const time = new Date(deadline).getTime();
  return Number.isFinite(time) && time <= now;
}

/**
 * A campaign is refundable once the deadline passes without reaching the goal.
 * Funds that reached the goal are only ever paid to the hospital.
 */
export function campaignPhase(
  campaign: Pick<TreatmentCampaign, 'goal' | 'raised' | 'deadline' | 'status'>,
  now: number = Date.now(),
): CampaignPhase {
  if (campaign.status === 'released') {
    return 'released';
  }
  if (campaign.status === 'refunded') {
    return 'refunded';
  }

  const { funded } = campaignProgress(campaign);
  if (isDeadlinePassed(campaign.deadline, now)) {
    return funded ? 'released' : 'refundable';
  }
  return funded ? 'goal-reached' : 'open';
}

const PHASE_NOTICES: Record<CampaignPhase, PhaseNotice> = {
  open: {
    tone: 'info',
    title: 'Accepting donations',
    message: 'Donations are held in escrow and paid to the hospital, never to the patient.',
  },
  'goal-reached': {
    tone: 'success',
    title: 'Goal reached',
    message: 'The goal is funded. The hospital releases the funds once treatment is confirmed.',
  },
  refundable: {
    tone: 'warning',
    title: 'Refundable',
    message: 'The deadline passed before the goal was reached. Donors can claim a refund of their donation.',
  },
  released: {
    tone: 'success',
    title: 'Funds released to the hospital',
    message: 'This campaign is closed and the hospital received the donations.',
  },
  refunded: {
    tone: 'warning',
    title: 'Refunded',
    message: 'This campaign did not reach its goal and the donations were refunded to the donors.',
  },
};

export function phaseNotice(phase: CampaignPhase): PhaseNotice {
  return PHASE_NOTICES[phase];
}

/** Localised deadline, e.g. `11/12/2026`. */
export function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  if (!Number.isFinite(date.getTime())) {
    return deadline;
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Whole days until the deadline; `0` once it has passed. */
export function daysLeft(deadline: string, now: number = Date.now()): number {
  const time = new Date(deadline).getTime();
  if (!Number.isFinite(time) || time <= now) {
    return 0;
  }
  return Math.ceil((time - now) / 86_400_000);
}

/**
 * Donate to a campaign. The contract pays the hospital directly, so the donor
 * never sends funds to the patient.
 * @param campaign - Campaign to donate to; must be linked on-chain.
 * @param amount - Amount in the campaign's currency, as a decimal string.
 */
export function donateToCampaign(
  campaign: TreatmentCampaign,
  amount: string,
): Promise<ContractCallResult> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to donate.');
  }
  if (!campaign.onChainCampaignId) {
    throw new Error('This campaign is not linked to an on-chain campaign yet.');
  }
  if (campaignPhase(campaign) !== 'open') {
    throw new Error('This campaign is closed and no longer accepts donations.');
  }

  const stroops = toStroops(amount);
  if (stroops <= BigInt(0)) {
    throw new Error('Enter an amount greater than zero.');
  }

  return submitContractCall({
    contractId: CROWDFUND_CONTRACT_ID,
    method: 'donate',
    args: [
      new Address(publicKey).toScVal(),
      nativeToScVal(BigInt(campaign.onChainCampaignId), { type: 'u64' }),
      nativeToScVal(stroops, { type: 'i128' }),
    ],
    missingContractMessage:
      'Crowdfunding contract is not configured (NEXT_PUBLIC_CROWDFUND_CONTRACT_ID).',
    describeError: (error: unknown) =>
      error instanceof Error ? error.message : 'The donation failed. Please try again.',
  });
}
