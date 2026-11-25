import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types';

/** How the wallet was connected. */
export type WalletType = 'freighter' | 'passkey';

interface WalletState {
  publicKey: string | null;
  role: UserRole | null;
  network: string;
  walletType: WalletType | null;
  /** WebAuthn credential backing the passkey smart wallet, if any. */
  passkeyCredentialId: string | null;
  setWallet: (publicKey: string, role: UserRole, walletType?: WalletType) => void;
  setPasskeyWallet: (
    smartWalletAddress: string,
    role: UserRole,
    credentialId: string,
  ) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      publicKey: null,
      role: null,
      network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet',
      walletType: null,
      passkeyCredentialId: null,
      setWallet: (publicKey, role, walletType = 'freighter') =>
        set({ publicKey, role, walletType, passkeyCredentialId: null }),
      /** A passkey smart wallet is identified by its contract address (C...). */
      setPasskeyWallet: (smartWalletAddress, role, credentialId) =>
        set({
          publicKey: smartWalletAddress,
          role,
          walletType: 'passkey',
          passkeyCredentialId: credentialId,
        }),
      disconnect: () =>
        set({
          publicKey: null,
          role: null,
          walletType: null,
          passkeyCredentialId: null,
        }),
    }),
    { name: 'wallet-store' },
  ),
);
