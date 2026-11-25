import { smartWalletAddressFromCredentialId } from '@/lib/passkey';

function credentialId(seed: number): ArrayBuffer {
  const bytes = new Uint8Array(32).fill(seed);
  return bytes.buffer;
}

describe('passkey smart wallet', () => {
  it('derives a Stellar contract address (C...) from a credential id', async () => {
    const address = await smartWalletAddressFromCredentialId(credentialId(1));

    expect(address).toMatch(/^C[A-Z2-7]{55}$/);
  });

  it('is deterministic for the same credential', async () => {
    const first = await smartWalletAddressFromCredentialId(credentialId(2));
    const second = await smartWalletAddressFromCredentialId(credentialId(2));

    expect(first).toBe(second);
  });

  it('gives different passkeys different smart wallets', async () => {
    const first = await smartWalletAddressFromCredentialId(credentialId(3));
    const second = await smartWalletAddressFromCredentialId(credentialId(4));

    expect(first).not.toBe(second);
  });
});
