import { formatStroops, toStroops } from '@/lib/amounts';
import {
  daysUntilRoundEnd,
  forgetPool,
  nextRecipient,
  parseSavingsPool,
  rememberPool,
  rememberedPools,
  rotation,
  roundEndsAt,
} from '@/lib/savings';

const ORGANISER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const MEMBER_B = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const MEMBER_C = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

function nativePool(overrides: Record<string, unknown> = {}) {
  return {
    id: BigInt(1),
    organiser: ORGANISER,
    token: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
    contribution: BigInt(50_000_000),
    period_secs: BigInt(2_592_000),
    members: [ORGANISER, MEMBER_B, MEMBER_C],
    start: BigInt(1_000),
    round: 1,
    pot: BigInt(150_000_000),
    ...overrides,
  };
}

describe('savings pool helpers', () => {
  it('maps the contract struct to the UI shape', () => {
    const pool = parseSavingsPool(nativePool());

    expect(pool.id).toBe('1');
    expect(pool.organiser).toBe(ORGANISER);
    expect(pool.contribution).toBe('50000000');
    expect(pool.periodSecs).toBe(2_592_000);
    expect(pool.members).toHaveLength(3);
    expect(pool.round).toBe(1);
    expect(pool.pot).toBe('150000000');
  });

  it('rotates the payout to the next member each round', () => {
    expectingRound(0, ORGANISER);
    expectingRound(1, MEMBER_B);
    expectingRound(3, ORGANISER);
  });

  it('lists members in payout order', () => {
    const seats = rotation(parseSavingsPool(nativePool()));

    expect(seats.map((seat) => seat.paysOnRound)).toEqual([0, 1, 2]);
    expect(seats[1].member).toBe(MEMBER_B);
  });

  it('ends the current round one period after the previous one', () => {
    const pool = parseSavingsPool(nativePool({ round: 1 }));

    expect(roundEndsAt(pool)).toBe((1_000 + 2_592_000 * 2) * 1_000);
    expect(daysUntilRoundEnd(pool, roundEndsAt(pool) - 86_400_000)).toBe(1);
    expect(daysUntilRoundEnd(pool, roundEndsAt(pool))).toBe(0);
  });

  it('handles a pool without members', () => {
    expect(nextRecipient(parseSavingsPool(nativePool({ members: [] })))).toBeNull();
  });
});

function expectingRound(round: number, expected: string) {
  const pool = parseSavingsPool(nativePool({ round }));
  expect(nextRecipient(pool)).toBe(expected);
}

describe('amount helpers', () => {
  it('converts between decimal amounts and stroops', () => {
    expect(toStroops('1')).toBe(BigInt(10_000_000));
    expect(toStroops('0.0000001')).toBe(BigInt(1));
    expect(formatStroops(BigInt(12_500_000))).toBe('1.25');
    expect(formatStroops(BigInt(50_000_000))).toBe('5');
    expect(formatStroops('150000000')).toBe('15');
  });
});

describe('remembered pools', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('remembers pools once, newest first', () => {
    rememberPool('1');
    rememberPool('2');
    rememberPool('1');

    expect(rememberedPools()).toEqual(['1', '2']);
  });

  it('forgets a pool', () => {
    rememberPool('1');
    rememberPool('2');
    forgetPool('1');

    expect(rememberedPools()).toEqual(['2']);
  });
});
