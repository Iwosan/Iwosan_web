import type { DrugBatchVerification } from '@/services/batches.service';

const BATCH_ID = /^[0-9a-f]{64}$/i;

export function isValidBatchId(value: string): boolean {
  return BATCH_ID.test(value.trim());
}

/**
 * Read a batch id from scanned QR content: either the id itself or a
 * verification link ending in `/verify/<batchId>`. Returns `null` otherwise.
 */
export function extractBatchId(scanned: string): string | null {
  const value = scanned.trim();
  if (isValidBatchId(value)) {
    return value.toLowerCase();
  }
  const match = /\/verify\/([0-9a-f]{64})\/?(?:[?#].*)?$/i.exec(value);
  return match?.[1] ? match[1].toLowerCase() : null;
}

export interface StatusBanner {
  tone: 'danger' | 'warning' | 'success';
  title: string;
  message: string;
}

/** What to tell the user about a batch. A recall outranks expiry. */
export function statusBanner(batch: Pick<DrugBatchVerification, 'status'>): StatusBanner {
  switch (batch.status) {
    case 'recalled':
      return {
        tone: 'danger',
        title: 'Recalled — do not use',
        message:
          'This batch has been recalled. Stop using it and return it to the seller or a pharmacist.',
      };
    case 'expired':
      return {
        tone: 'warning',
        title: 'Expired',
        message: 'This batch is past its expiry date. Do not use it.',
      };
    default:
      return {
        tone: 'success',
        title: 'Genuine and in date',
        message: 'This batch is registered on the Stellar network and has not been recalled.',
      };
  }
}

/** Shorten a Stellar address for display, e.g. `GABC…WXYZ`. */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}
