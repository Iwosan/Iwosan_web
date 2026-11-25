import { jwtExpiry, openAnchorPopup } from '@/lib/anchor';
import type { AnchorInteraction } from '@/services/anchor.service';
import { useAnchorStore } from '@/store/useAnchorStore';

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
}

function interaction(id: string, direction: AnchorInteraction['direction'] = 'deposit') {
  return {
    id,
    direction,
    status: 'incomplete',
    url: `https://testanchor.stellar.org/sep24/${id}`,
    anchorTransactionId: null,
  };
}

describe('jwtExpiry', () => {
  it('reads the exp claim in milliseconds', () => {
    expect(jwtExpiry(jwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });

  it('returns 0 for malformed tokens', () => {
    expect(jwtExpiry('not-a-jwt')).toBe(0);
    expect(jwtExpiry(jwt({ sub: 'no-exp' }))).toBe(0);
  });
});

describe('openAnchorPopup', () => {
  const originalOpen = window.open;
  afterEach(() => {
    window.open = originalOpen;
  });

  it('opens the anchor and cuts the opener link', () => {
    const popup = { opener: window } as unknown as Window;
    window.open = jest.fn(() => popup);

    expect(openAnchorPopup('https://anchor.example/interactive')).toBe(true);
    expect(popup.opener).toBeNull();
  });

  it('reports a blocked popup so a link can be shown', () => {
    window.open = jest.fn(() => null);

    expect(openAnchorPopup('https://anchor.example/interactive')).toBe(false);
  });
});

describe('useAnchorStore', () => {
  beforeEach(() => useAnchorStore.getState().clear());

  it('records requests newest first', () => {
    const details = { account: 'GACCOUNT', amount: '10', assetCode: 'USDC' };
    useAnchorStore.getState().record(interaction('a'), details);
    useAnchorStore.getState().record(interaction('b', 'withdraw'), details);

    expect(useAnchorStore.getState().activity.map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('replaces an entry with the same id instead of duplicating it', () => {
    const details = { account: 'GACCOUNT', amount: null, assetCode: 'USDC' };
    useAnchorStore.getState().record(interaction('a'), details);
    useAnchorStore
      .getState()
      .record({ ...interaction('a'), status: 'pending_user_transfer_start' }, details);

    const { activity } = useAnchorStore.getState();
    expect(activity).toHaveLength(1);
    expect(activity[0]?.status).toBe('pending_user_transfer_start');
  });
});
