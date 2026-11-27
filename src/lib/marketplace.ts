import { Address, nativeToScVal } from '@stellar/stellar-sdk';
import type { MarketplaceListing, MarketplaceOrder } from '@/services/api.service';
import { useWalletStore } from '@/store/useWalletStore';
import { submitContractCall } from '@/lib/soroban';

export { signWithWallet } from '@/lib/soroban';

const MARKETPLACE_CONTRACT_ID = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID || '';

/** `Error` codes from `iwosan-marketplace`, mapped to user-facing messages. */
const CONTRACT_ERRORS: Record<number, string> = {
  1: 'This listing no longer exists.',
  2: 'This order no longer exists.',
  3: 'The amount is not valid.',
  4: 'This listing is no longer active.',
  5: 'This listing has not been verified yet.',
  6: 'There is not enough stock for that quantity.',
  7: 'This listing does not support that trade mode.',
  8: 'This order has already been settled.',
};

export interface SubmitOrderResult {
  hash: string;
  orderId: string | null;
}

export function describeMarketplaceError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = /Error\(Contract, #(\d+)\)/.exec(message);
  if (code?.[1]) {
    return CONTRACT_ERRORS[Number(code[1])] ?? `The marketplace rejected the request (code ${code[1]}).`;
  }
  return message || 'The transaction failed. Please try again.';
}

async function submitOrderCall(
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
): Promise<SubmitOrderResult> {
  const result = await submitContractCall({
    contractId: MARKETPLACE_CONTRACT_ID,
    method,
    args,
    missingContractMessage:
      'Marketplace contract is not configured (NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID).',
    describeError: describeMarketplaceError,
  });

  return { hash: result.hash, orderId: result.value };
}

/** Buyer places an order; funds are held in escrow by the contract. */
export function placeOrder(listing: MarketplaceListing, units: number): Promise<SubmitOrderResult> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to place an order.');
  }
  if (!listing.onChainListingId) {
    throw new Error('This listing is not linked to an on-chain listing yet.');
  }
  if (units < 1) {
    throw new Error('Choose at least one unit.');
  }
  if (listing.mode === 'sale' && units > listing.stock) {
    throw new Error('There is not enough stock for that quantity.');
  }

  return submitOrderCall('place_order', [
    new Address(publicKey).toScVal(),
    nativeToScVal(BigInt(listing.onChainListingId), { type: 'u64' }),
    nativeToScVal(units, { type: 'u32' }),
  ]);
}

/** Buyer confirms delivery/service; escrow is released to the seller. */
export function confirmOrder(order: MarketplaceOrder): Promise<SubmitOrderResult> {
  return submitOrderCall('confirm_order', [
    nativeToScVal(BigInt(order.onChainOrderId), { type: 'u64' }),
  ]);
}

/** Seller refunds the buyer; escrow returns to the buyer. */
export function refundOrder(order: MarketplaceOrder): Promise<SubmitOrderResult> {
  return submitOrderCall('refund_order', [
    nativeToScVal(BigInt(order.onChainOrderId), { type: 'u64' }),
  ]);
}
