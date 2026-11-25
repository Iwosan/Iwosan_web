import { act } from '@testing-library/react';
import { useWalletStore } from '@/store/useWalletStore';

beforeEach(() => {
  useWalletStore.setState({
    publicKey: null,
    role: null,
    network: 'testnet',
    walletType: null,
    passkeyCredentialId: null,
  });
});

describe('useWalletStore', () => {
  it('initializes with null publicKey and role', () => {
    const { publicKey, role } = useWalletStore.getState();
    expect(publicKey).toBeNull();
    expect(role).toBeNull();
  });

  it('sets wallet with publicKey and role', () => {
    act(() => {
      useWalletStore.getState().setWallet('GPUBLIC123', 'PATIENT');
    });
    const { publicKey, role } = useWalletStore.getState();
    expect(publicKey).toBe('GPUBLIC123');
    expect(role).toBe('PATIENT');
  });

  it('sets wallet with DOCTOR role', () => {
    act(() => {
      useWalletStore.getState().setWallet('GDOCTOR456', 'DOCTOR');
    });
    expect(useWalletStore.getState().role).toBe('DOCTOR');
    expect(useWalletStore.getState().publicKey).toBe('GDOCTOR456');
  });

  it('disconnects and clears publicKey and role', () => {
    act(() => {
      useWalletStore.getState().setWallet('GPUBLIC123', 'PATIENT');
    });
    act(() => {
      useWalletStore.getState().disconnect();
    });
    expect(useWalletStore.getState().publicKey).toBeNull();
    expect(useWalletStore.getState().role).toBeNull();
  });

  it('preserves network after disconnect', () => {
    act(() => {
      useWalletStore.getState().setWallet('GPUBLIC', 'PATIENT');
      useWalletStore.getState().disconnect();
    });
    expect(useWalletStore.getState().network).toBe('testnet');
  });

  it('setWallet overwrites previous wallet', () => {
    act(() => {
      useWalletStore.getState().setWallet('GFIRST', 'PATIENT');
      useWalletStore.getState().setWallet('GSECOND', 'DOCTOR');
    });
    expect(useWalletStore.getState().publicKey).toBe('GSECOND');
    expect(useWalletStore.getState().role).toBe('DOCTOR');
  });

  describe('passkey smart wallet', () => {
    const CONTRACT = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

    it('records the wallet type as freighter for extension wallets', () => {
      act(() => {
        useWalletStore.getState().setWallet('GFREIGHTER', 'PATIENT');
      });
      expect(useWalletStore.getState().walletType).toBe('freighter');
      expect(useWalletStore.getState().passkeyCredentialId).toBeNull();
    });

    it('stores the smart-wallet contract address and credential id', () => {
      act(() => {
        useWalletStore.getState().setPasskeyWallet(CONTRACT, 'DOCTOR', 'credential-abc');
      });

      const state = useWalletStore.getState();
      expect(state.publicKey).toBe(CONTRACT);
      expect(state.role).toBe('DOCTOR');
      expect(state.walletType).toBe('passkey');
      expect(state.passkeyCredentialId).toBe('credential-abc');
    });

    it('switching to a Freighter wallet clears the passkey credential', () => {
      act(() => {
        useWalletStore.getState().setPasskeyWallet(CONTRACT, 'PATIENT', 'credential-abc');
        useWalletStore.getState().setWallet('GFREIGHTER', 'PATIENT');
      });

      expect(useWalletStore.getState().walletType).toBe('freighter');
      expect(useWalletStore.getState().passkeyCredentialId).toBeNull();
    });

    it('disconnect clears the passkey wallet details', () => {
      act(() => {
        useWalletStore.getState().setPasskeyWallet(CONTRACT, 'PATIENT', 'credential-abc');
      });
      act(() => {
        useWalletStore.getState().disconnect();
      });

      const state = useWalletStore.getState();
      expect(state.publicKey).toBeNull();
      expect(state.walletType).toBeNull();
      expect(state.passkeyCredentialId).toBeNull();
    });
  });
});
