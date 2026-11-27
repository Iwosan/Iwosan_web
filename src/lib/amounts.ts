const STROOPS_PER_UNIT = BigInt(10_000_000);
const STROOP_DECIMALS = 7;
const STROOP_SCALE = BigInt(10) ** BigInt(STROOP_DECIMALS);

/** Convert a decimal amount (up to 7 dp) to stroops. */
export function toStroops(amount: string): bigint {
  const [whole = '0', fraction = ''] = String(amount).trim().split('.');
  return BigInt(whole || '0') * STROOPS_PER_UNIT + BigInt((fraction + '0000000').slice(0, 7));
}

/** Convert an on-chain amount in stroops to a decimal string. */
export function formatStroops(value: string | bigint | number): string {
  let raw: bigint;
  try {
    const [whole] = String(value || '0').split('.');
    raw = typeof value === 'bigint' ? value : BigInt(whole ?? '0');
  } catch {
    return '0';
  }

  const negative = raw < BigInt(0);
  const absolute = negative ? -raw : raw;
  const whole = absolute / STROOP_SCALE;
  const fraction = (absolute % STROOP_SCALE)
    .toString()
    .padStart(STROOP_DECIMALS, '0')
    .replace(/0+$/, '');

  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}
