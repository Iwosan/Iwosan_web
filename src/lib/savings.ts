import { Address, nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { toStroops } from '@/lib/amounts';
import { readContractCall, submitContractCall, type ContractCallResult } from '@/lib/soroban';
import { useWalletStore } from '@/store/useWalletStore';

const SAVINGS_CONTRACT_ID = process.env.NEXT_PUBLIC_SAVINGS_POOL_CONTRACT_ID || '';
const SECONDS_PER_DAY = 86_400;
const POOLS_KEY = 'iwosan.savings.pools';
const REQUESTS_KEY = 'iwosan.savings.requests';

/** A rotating health savings pool (ajo/esusu), read from the contract. */
export interface SavingsPool {
  id: string;
  organiser: string;
  /** Token the contributions are paid in. */
  token: string;
  /** Contribution per member per round, in stroops. */
  contribution: string;
  periodSecs: number;
  /** Payout order: round `r` pays `members[r % members.length]`. */
  members: string[];
  /** Ledger timestamp when the pool was created. */
  start: number;
  round: number;
  /** Contributions collected in the current round, in stroops. */
  pot: string;
}

/** An emergency withdrawal request and its approvals. */
export interface EmergencyRequestView {
  id: string;
  member: string;
  /** Amount requested, in stroops. */
  amount: string;
  approvals: number;
  paid: boolean;
}

export function savingsContractConfigured(): boolean {
  return Boolean(SAVINGS_CONTRACT_ID);
}

function poolIdArg(poolId: string): xdr.ScVal {
  return nativeToScVal(BigInt(poolId), { type: 'u64' });
}

function addressArg(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

function contractParams(method: string) {
  return {
    contractId: SAVINGS_CONTRACT_ID,
    method,
    missingContractMessage:
      'Savings pool contract is not configured (NEXT_PUBLIC_SAVINGS_POOL_CONTRACT_ID).',
  };
}

/** Map the contract's snake_case struct to the shape the UI uses. */
export function parseSavingsPool(raw: Record<string, unknown>): SavingsPool {
  return {
    id: String(raw.id ?? ''),
    organiser: String(raw.organiser ?? ''),
    token: String(raw.token ?? ''),
    contribution: String(raw.contribution ?? '0'),
    periodSecs: Number(raw.period_secs ?? 0),
    members: Array.isArray(raw.members) ? raw.members.map(String) : [],
    start: Number(raw.start ?? 0),
    round: Number(raw.round ?? 0),
    pot: String(raw.pot ?? '0'),
  };
}

/** The member the current round pays out to, or `null` for an empty pool. */
export function nextRecipient(pool: SavingsPool): string | null {
  if (pool.members.length === 0) {
    return null;
  }
  return pool.members[pool.round % pool.members.length] ?? null;
}

/** Members in payout order, with the round each of them is paid in. */
export function rotation(pool: SavingsPool): Array<{ member: string; paysOnRound: number }> {
  return pool.members.map((member, index) => ({ member, paysOnRound: index }));
}

/** When the current round ends, as a Unix timestamp in milliseconds. */
export function roundEndsAt(pool: SavingsPool): number {
  return (pool.start + pool.periodSecs * (pool.round + 1)) * 1_000;
}

/** Whole days until the current round ends; 0 once it has. */
export function daysUntilRoundEnd(pool: SavingsPool, now: number = Date.now()): number {
  const remaining = roundEndsAt(pool) - now;
  return remaining <= 0 ? 0 : Math.ceil(remaining / 86_400_000);
}

/** Localised round end, e.g. `Dec 1, 2026`. */
export function formatRoundEnd(pool: SavingsPool): string {
  const date = new Date(roundEndsAt(pool));
  if (!Number.isFinite(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function fetchSavingsPool(poolId: string): Promise<SavingsPool> {
  const raw = await readContractCall<Record<string, unknown>>({
    ...contractParams('get_pool'),
    args: [poolIdArg(poolId)],
  });
  return parseSavingsPool(raw ?? {});
}

/** Whether the connected member has already contributed this round. */
export function fetchHasContributed(poolId: string, member: string): Promise<boolean> {
  return readContractCall<boolean>({
    ...contractParams('has_contributed'),
    args: [poolIdArg(poolId), addressArg(member)],
  });
}

export function fetchNextRecipient(poolId: string): Promise<string> {
  return readContractCall<string>({
    ...contractParams('next_recipient'),
    args: [poolIdArg(poolId)],
  });
}

export async function fetchEmergencyRequest(
  poolId: string,
  requestId: string,
): Promise<EmergencyRequestView> {
  const raw = await readContractCall<Record<string, unknown>>({
    ...contractParams('get_request'),
    args: [poolIdArg(poolId), nativeToScVal(Number(requestId), { type: 'u32' })],
  });
  return {
    id: String(raw?.id ?? requestId),
    member: String(raw?.member ?? ''),
    amount: String(raw?.amount ?? '0'),
    approvals: Number(raw?.approvals ?? 0),
    paid: Boolean(raw?.paid),
  };
}

export interface CreatePoolInput {
  /** Token the pool is funded in, e.g. a USDC SAC address. */
  token: string;
  contribution: string;
  periodDays: number;
  /** Other members, in payout order. The organiser is always included first. */
  members: string[];
}

/** Create a pool; the connected wallet becomes the organiser and first member. */
export function createSavingsPool(input: CreatePoolInput): Promise<ContractCallResult> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to create a pool.');
  }
  if (!SAVINGS_CONTRACT_ID) {
    throw new Error(
      'Savings pool contract is not configured (NEXT_PUBLIC_SAVINGS_POOL_CONTRACT_ID).',
    );
  }

  const contribution = toStroops(input.contribution);
  if (contribution <= BigInt(0)) {
    throw new Error('Enter a contribution greater than zero.');
  }
  if (!Number.isFinite(input.periodDays) || input.periodDays <= 0) {
    throw new Error('Enter a period of at least one day.');
  }

  const members = [publicKey, ...input.members.filter((member) => member !== publicKey)];
  if (members.length < 2) {
    throw new Error('A pool needs at least two members.');
  }

  return submitContractCall({
    ...contractParams('create_pool'),
    args: [
      addressArg(publicKey),
      addressArg(input.token),
      nativeToScVal(contribution, { type: 'i128' }),
      nativeToScVal(BigInt(Math.round(input.periodDays * SECONDS_PER_DAY)), { type: 'u64' }),
      xdr.ScVal.scvVec(members.map(addressArg)),
    ],
    describeError: (error: unknown) =>
      error instanceof Error ? error.message : 'Could not create the pool.',
  });
}

/** Pay this round's contribution. */
export function contributeToPool(pool: SavingsPool): Promise<ContractCallResult> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to contribute.');
  }
  return submitContractCall({
    ...contractParams('contribute'),
    args: [poolIdArg(pool.id), addressArg(publicKey)],
    describeError: (error: unknown) =>
      error instanceof Error ? error.message : 'The contribution failed. Please try again.',
  });
}

/** Ask to withdraw from the pot early for a medical emergency. */
export function requestEmergencyWithdrawal(
  poolId: string,
  amount: string,
): Promise<ContractCallResult> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to request an emergency withdrawal.');
  }
  const stroops = toStroops(amount);
  if (stroops <= BigInt(0)) {
    throw new Error('Enter an amount greater than zero.');
  }
  return submitContractCall({
    ...contractParams('request_emergency'),
    args: [poolIdArg(poolId), addressArg(publicKey), nativeToScVal(stroops, { type: 'i128' })],
    describeError: (error: unknown) =>
      error instanceof Error ? error.message : 'Could not submit the request.',
  });
}

/** Approve an emergency request; a majority of members releases the funds. */
export function approveEmergencyWithdrawal(
  poolId: string,
  requestId: string,
): Promise<ContractCallResult> {
  const { publicKey } = useWalletStore.getState();
  if (!publicKey) {
    throw new Error('Connect a wallet to vote.');
  }
  return submitContractCall({
    ...contractParams('approve_emergency'),
    args: [poolIdArg(poolId), nativeToScVal(Number(requestId), { type: 'u32' }), addressArg(publicKey)],
    describeError: (error: unknown) =>
      error instanceof Error ? error.message : 'Could not record the approval.',
  });
}

/** Pools opened in this browser, so the user can find them again. */
export function rememberedPools(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const value = JSON.parse(window.localStorage.getItem(POOLS_KEY) ?? '[]');
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function rememberPool(poolId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const pools = [poolId, ...rememberedPools().filter((id) => id !== poolId)];
  window.localStorage.setItem(POOLS_KEY, JSON.stringify(pools));
}

export function forgetPool(poolId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    POOLS_KEY,
    JSON.stringify(rememberedPools().filter((id) => id !== poolId)),
  );
}

function rememberedRequests(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const value = JSON.parse(window.localStorage.getItem(REQUESTS_KEY) ?? '{}');
    return value && typeof value === 'object' ? (value as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberedRequest(poolId: string): string | null {
  return rememberedRequests()[poolId] ?? null;
}

export function rememberRequest(poolId: string, requestId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    REQUESTS_KEY,
    JSON.stringify({ ...rememberedRequests(), [poolId]: requestId }),
  );
}

