import { Asset, Keypair } from '@stellar/stellar-sdk';
import { assetCode, isQuoteExpired, maxSendAmount, parseAsset } from '@/lib/pathPayment';
import type { MarketplaceQuote } from '@/services/api.service';

const ISSUER = Keypair.random().publicKey();

function quote(expiresAt: string): MarketplaceQuote {
  return {
    listingId: 'listing-1',
    units: 1,
    sourceAsset: `NGN:${ISSUER}`,
    sourceAmount: '1500.0000000',
    destinationAsset: `USDC:${ISSUER}`,
    destinationAmount: '1.0000000',
    path: [],
    xdr: null,
    expiresAt,
  };
}

describe('pathPayment helpers', () => {
  it('parses native and issued assets', () => {
    expect(parseAsset('XLM').isNative()).toBe(true);
    expect(parseAsset('native').isNative()).toBe(true);

    const ngn = parseAsset(`NGN:${ISSUER}`);
    expect(ngn).toBeInstanceOf(Asset);
    expect(ngn.getCode()).toBe('NGN');
    expect(ngn.getIssuer()).toBe(ISSUER);
  });

  it('rejects a bare asset code', () => {
    expect(() => parseAsset('NGN')).toThrow('Unsupported asset');
  });

  it('adds 1% slippage and rounds up to 7 decimals', () => {
    expect(maxSendAmount('1500')).toBe('1515.0000000');
    expect(maxSendAmount('0.0000001')).toBe('0.0000002');
  });

  it('detects expired quotes', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');

    expect(isQuoteExpired(quote('2025-12-31T23:59:59Z'), now)).toBe(true);
    expect(isQuoteExpired(quote('2026-01-01T00:00:30Z'), now)).toBe(false);
  });

  it('shows short asset codes', () => {
    expect(assetCode(`NGN:${ISSUER}`)).toBe('NGN');
    expect(assetCode('native')).toBe('XLM');
    expect(assetCode('XLM')).toBe('XLM');
  });
});
