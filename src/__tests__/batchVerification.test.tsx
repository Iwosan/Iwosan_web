import { render, screen } from '@testing-library/react';
import BatchStatusBanner from '@/components/batches/BatchStatusBanner';
import {
  extractBatchId,
  isValidBatchId,
  shortAddress,
  statusBanner,
} from '@/lib/batchVerification';

const BATCH = 'ab'.repeat(32);

describe('batch verification helpers', () => {
  it('accepts 64 hex characters only', () => {
    expect(isValidBatchId(BATCH)).toBe(true);
    expect(isValidBatchId(BATCH.toUpperCase())).toBe(true);
    expect(isValidBatchId(BATCH.slice(1))).toBe(false);
    expect(isValidBatchId(`${BATCH.slice(1)}z`)).toBe(false);
  });

  it('extracts the batch id from a raw code or a verification link', () => {
    expect(extractBatchId(` ${BATCH.toUpperCase()} `)).toBe(BATCH);
    expect(extractBatchId(`https://iwosan.app/verify/${BATCH}`)).toBe(BATCH);
    expect(extractBatchId(`https://iwosan.app/verify/${BATCH}/?ref=qr`)).toBe(BATCH);
    expect(extractBatchId('https://example.com/not-a-batch')).toBeNull();
  });

  it('puts a recall ahead of expiry', () => {
    expect(statusBanner({ status: 'recalled' }).tone).toBe('danger');
    expect(statusBanner({ status: 'expired' }).tone).toBe('warning');
    expect(statusBanner({ status: 'valid' }).tone).toBe('success');
  });

  it('shortens long addresses', () => {
    expect(shortAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe('GABC…WXYZ');
    expect(shortAddress('GSHORT')).toBe('GSHORT');
  });
});

describe('BatchStatusBanner', () => {
  it('shows a recall warning in text, not just colour', () => {
    render(<BatchStatusBanner status="recalled" />);

    expect(screen.getByRole('status')).toHaveTextContent('Recalled — do not use');
  });

  it('shows a valid batch as genuine', () => {
    render(<BatchStatusBanner status="valid" />);

    expect(screen.getByRole('status')).toHaveTextContent('Genuine and in date');
  });
});
