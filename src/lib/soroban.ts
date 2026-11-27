import {
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  rpc,
  scValToNative,
  type xdr,
} from '@stellar/stellar-sdk';
import { useWalletStore } from '@/store/useWalletStore';

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
export const NETWORK_PASSPHRASE = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
const CONFIRMATION_ATTEMPTS = 20;
const CONFIRMATION_DELAY_MS = 1_500;

export interface ContractCallResult {
  hash: string;
  /** The contract's return value as a string, or `null` when it returns none. */
  value: string | null;
}

function sorobanServer(): rpc.Server {
  return new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });
}

/** Sign a transaction envelope with the connected wallet (Freighter). */
export async function signWithWallet(xdrEnvelope: string): Promise<string> {
  const { walletType, network } = useWalletStore.getState();
  if (walletType === 'passkey') {
    throw new Error(
      'Passkey smart wallets cannot sign escrow transactions yet. Connect Freighter to continue.',
    );
  }
  if (!window.freighter) {
    throw new Error('Freighter is not installed. Install it from freighter.app.');
  }
  return window.freighter.signTransaction(xdrEnvelope, {
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

/**
 * Read a contract method by simulating it with the connected wallet as the
 * source account. Nothing is signed or submitted.
 */
export async function readContractCall<T = unknown>(params: {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  /** Message shown when `contractId` is empty. */
  missingContractMessage: string;
}): Promise<T> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to read on-chain data.');
  }
  if (!params.contractId) {
    throw new Error(params.missingContractMessage);
  }

  const server = sorobanServer();
  const account = await server.getAccount(publicKey);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(params.contractId).call(params.method, ...params.args))
    .setTimeout(120)
    .build();

  const simulation = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(simulation.error);
  }
  if (!simulation.result) {
    return null as T;
  }
  return scValToNative(simulation.result.retval) as T;
}

/**
 * Simulate, sign and submit a contract invocation with the connected wallet.
 *
 * Simulating first surfaces contract errors before the user is asked to sign.
 */
export async function submitContractCall(params: {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  /** Message shown when `contractId` is empty. */
  missingContractMessage: string;
  /** Maps a failure (including contract errors) to a user-facing message. */
  describeError: (error: unknown) => string;
}): Promise<ContractCallResult> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to continue.');
  }
  if (!params.contractId) {
    throw new Error(params.missingContractMessage);
  }

  const server = sorobanServer();
  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(params.contractId);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(params.method, ...params.args))
      .setTimeout(120)
      .build();

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
      throw new Error(params.describeError(result));
    }
    const returnValue = 'returnValue' in result ? result.returnValue : null;
    return {
      hash: sent.hash,
      value: returnValue ? String(scValToNative(returnValue)) : null,
    };
  } catch (error: unknown) {
    throw new Error(params.describeError(error));
  }
}
