import api from '@/services/api.service';

export type BatchStatus = 'valid' | 'expired' | 'recalled';

export interface CustodyStep {
  /** Previous holder; `null` for the manufacturer's registration. */
  from: string | null;
  to: string;
  at: string;
}

/** Result of `GET /batches/:batchId` (drug-batch-registry contract). */
export interface DrugBatchVerification {
  batchId: string;
  product: string;
  kind: 'orthodox_drug' | 'native_drug';
  regulatoryNumber: string;
  manufacturer: string;
  holder: string;
  expiresAt: string;
  expired: boolean;
  recalled: boolean;
  status: BatchStatus;
  history: CustodyStep[];
  verifyUrl: string;
}

/**
 * Verify a drug batch: manufacturer, custody chain, expiry and recall status.
 * @param batchId - 64 hex characters, as printed in the pack's QR code.
 * @returns The {@link DrugBatchVerification}.
 * @throws {ApiError} 404 when no batch is registered with this id.
 */
export const fetchDrugBatch = (batchId: string) =>
  api.get<DrugBatchVerification>(`/batches/${batchId}`).then((r) => r.data);
