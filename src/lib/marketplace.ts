import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk';
import type { MarketplaceListing, MarketplaceOrder } from '@/services/api.service';
import { useWalletStore } from '@/store/useWalletStore';

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const MARKETPLACE_CONTRACT_ID = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID || '';
const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
const NETWORK_PASSPHRASE = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
const CONFIRMATION_ATTEMPTS = 20;
const CONFIRMATION_DELAY_MS = 1_500;

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

function sorobanServer(): rpc.Server {
  return new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });
}

/** Sign a transaction envelope with the connected wallet (Freighter). */
export async function signWithWallet(xdr: string): Promise<string> {
  const { walletType, network } = useWalletStore.getState();
  if (walletType === 'passkey') {
    throw new Error(
      'Passkey smart wallets cannot sign escrow transactions yet. Connect Freighter to continue.',
    );
  }
  if (!window.freighter) {
    throw new Error('Freighter is not installed. Install it from freighter.app.');
  }
  return window.freighter.signTransaction(xdr, {
    network: network === 'mainnet' ? 'PUBLIC' : 'TESTNET',
    networkPassphrase: NETWORK_PASSPHRASE,
  });
}

async function waitForResult(server: rpc.Server, hash: string) {
  for (let attempt = 0; attempt < CONFIRMATION_ATTEMPTS; attempt += 1) {
    const result = await server.getTransaction(hash);
    if (result.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_DELAY_MS));
  }
  throw new Error('Timed out waiting for the transaction to confirm. Check the explorer shortly.');
}

async function submitContractCall(
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
): Promise<SubmitOrderResult> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to continue.');
  }
  if (!MARKETPLACE_CONTRACT_ID) {
    throw new Error('Marketplace contract is not configured (NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID).');
  }

  const server = sorobanServer();
  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(MARKETPLACE_CONTRACT_ID);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(120)
      .build();

    // Simulating first surfaces contract errors (not verified, out of stock)
    // before the user is asked to sign.
    const prepared = await server.prepareTransaction(tx);
    const signedXdr = await signWithWallet(prepared.toXDR());
    const sent = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE),
    );
    if (sent.status === 'ERROR') {
      throw new Error('The network rejected the transaction. Check your balance and try again.');
    }

    const result = await waitForResult(server, sent.hash);
    if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(describeMarketplaceError(result));
    }
    const returnValue = 'returnValue' in result ? result.returnValue : null;
    return {
      hash: sent.hash,
      orderId: returnValue ? String(scValToNative(returnValue)) : null,
    };
  } catch (error: unknown) {
    throw new Error(describeMarketplaceError(error));
  }
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

  return submitContractCall('place_order', [
    new Address(publicKey).toScVal(),
    nativeToScVal(BigInt(listing.onChainListingId), { type: 'u64' }),
    nativeToScVal(units, { type: 'u32' }),
  ]);
}

/** Buyer confirms delivery/service; escrow is released to the seller. */
export function confirmOrder(order: MarketplaceOrder): Promise<SubmitOrderResult> {
  return submitContractCall('confirm_order', [
    nativeToScVal(BigInt(order.onChainOrderId), { type: 'u64' }),
  ]);
}

/** Seller refunds the buyer; escrow returns to the buyer. */
export function refundOrder(order: MarketplaceOrder): Promise<SubmitOrderResult> {
  return submitContractCall('refund_order', [
    nativeToScVal(BigInt(order.onChainOrderId), { type: 'u64' }),
  ]);
}
