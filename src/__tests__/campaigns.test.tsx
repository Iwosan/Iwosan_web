import { render, screen } from '@testing-library/react';
import CampaignCard from '@/components/campaigns/CampaignCard';
import CampaignProgressBar from '@/components/campaigns/CampaignProgressBar';
import CampaignStatusBanner from '@/components/campaigns/CampaignStatusBanner';
import {
  campaignPhase,
  campaignProgress,
  daysLeft,
  donateToCampaign,
  isDeadlinePassed,
  phaseNotice,
  toStroops,
} from '@/lib/campaigns';
import type { TreatmentCampaign } from '@/services/campaigns.service';
import { useWalletStore } from '@/store/useWalletStore';

const NOW = new Date('2026-11-01T00:00:00Z').getTime();
const HOSPITAL = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const PATIENT = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

function campaign(overrides: Partial<TreatmentCampaign> = {}): TreatmentCampaign {
  return {
    id: 'campaign-1',
    onChainCampaignId: '7',
    patientAddress: PATIENT,
    title: 'Help Amina get a kidney transplant',
    hospitalName: 'Lagos University Teaching Hospital',
    hospitalAddress: HOSPITAL,
    hospitalVerified: true,
    story: 'Amina needs a transplant.',
    goal: '2000',
    raised: '500',
    currency: 'USDC',
    donorCount: 4,
    deadline: '2026-12-01T00:00:00Z',
    status: 'active',
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

describe('campaign helpers', () => {
  beforeEach(() => {
    useWalletStore.setState({ publicKey: PATIENT, role: 'PATIENT', walletType: 'freighter' });
  });

  afterAll(() => {
    useWalletStore.getState().disconnect();
  });

  it('computes progress and the amount still needed', () => {
    expect(campaignProgress({ goal: '2000', raised: '500' })).toEqual({
      percent: 25,
      remaining: '1500',
      funded: false,
    });
  });

  it('caps progress at 100% once the goal is met', () => {
    const progress = campaignProgress({ goal: '2000', raised: '2500' });

    expect(progress.percent).toBe(100);
    expect(progress.remaining).toBe('0');
    expect(progress.funded).toBe(true);
  });

  it('does not divide by a zero goal', () => {
    expect(campaignProgress({ goal: '0', raised: '10' }).percent).toBe(0);
  });

  it('is open while the deadline has not passed', () => {
    expect(campaignPhase(campaign(), NOW)).toBe('open');
  });

  it('shows the goal as reached when funded before the deadline', () => {
    expect(campaignPhase(campaign({ raised: '2000' }), NOW)).toBe('goal-reached');
  });

  it('becomes refundable when the deadline passes without the goal', () => {
    const phase = campaignPhase(campaign(), new Date('2026-12-02T00:00:00Z').getTime());

    expect(phase).toBe('refundable');
    expect(phaseNotice(phase).tone).toBe('warning');
    expect(phaseNotice(phase).message).toMatch(/refund/i);
  });

  it('reports the released and refunded states', () => {
    expect(campaignPhase(campaign({ status: 'released' }), NOW)).toBe('released');
    expect(campaignPhase(campaign({ status: 'refunded' }), NOW)).toBe('refunded');
  });

  it('counts whole days until the deadline', () => {
    expect(daysLeft('2026-11-03T00:00:00Z', NOW)).toBe(2);
    expect(daysLeft('2026-10-01T00:00:00Z', NOW)).toBe(0);
    expect(isDeadlinePassed('2026-10-01T00:00:00Z', NOW)).toBe(true);
  });

  it('converts decimal amounts to stroops', () => {
    expect(toStroops('1')).toBe(BigInt(10_000_000));
    expect(toStroops('1.25')).toBe(BigInt(12_500_000));
    expect(toStroops('0.0000001')).toBe(BigInt(1));
  });

  it('refuses to donate to a campaign that is not linked on-chain', () => {
    expect(() => donateToCampaign(campaign({ onChainCampaignId: null }), '10')).toThrow(
      /not linked to an on-chain campaign/i,
    );
  });

  it('refuses donations after the deadline', () => {
    const closed = campaign({ deadline: '2026-01-01T00:00:00Z' });

    expect(() => donateToCampaign(closed, '10')).toThrow(/no longer accepts donations/i);
  });

  it('refuses a zero donation', () => {
    expect(() => donateToCampaign(campaign(), '0')).toThrow(/greater than zero/i);
  });
});

describe('CampaignProgressBar', () => {
  it('exposes the progress to assistive technology and in text', () => {
    render(<CampaignProgressBar goal="2000" raised="500" currency="USDC" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText(/raised of/)).toHaveTextContent('500 USDC raised of 2000 USDC (25%)');
  });
});

describe('CampaignStatusBanner', () => {
  it('explains the refund state after the deadline', () => {
    render(<CampaignStatusBanner phase="refundable" />);

    expect(screen.getByRole('status')).toHaveTextContent('Refundable');
    expect(screen.getByRole('status')).toHaveTextContent(/claim a refund/i);
  });

  it('says funds go to the hospital while the campaign is open', () => {
    render(<CampaignStatusBanner phase="open" />);

    expect(screen.getByRole('status')).toHaveTextContent(/paid to the hospital/i);
  });
});

describe('CampaignCard', () => {
  it('shows the hospital, progress and deadline', () => {
    render(
      <ul>
        <CampaignCard campaign={campaign()} />
      </ul>,
    );

    expect(screen.getByRole('link', { name: /Amina/ })).toHaveAttribute(
      'href',
      '/campaigns/campaign-1',
    );
    expect(screen.getByText(/Lagos University Teaching Hospital/)).toBeInTheDocument();
    expect(screen.getByText(/raised of/)).toBeInTheDocument();
    expect(screen.getByText(/deadline Dec 1, 2026/)).toBeInTheDocument();
  });
});
