'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import CashInOut from '@/components/wallet/CashInOut';
import { useWalletStore } from '@/store/useWalletStore';

export default function WalletPage() {
  const { publicKey, walletType } = useWalletStore();

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-8 py-24 space-y-6">
      <h1 className="text-2xl font-bold text-text-1">Wallet</h1>

      {!publicKey && (
        <Link href="/login" className="btn-primary inline-flex">
          Connect a wallet to continue
        </Link>
      )}

      {publicKey && walletType === 'passkey' && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          Cash in and cash out need a Freighter wallet for now. Passkey wallets are not supported by
          anchors yet.
        </p>
      )}

      {publicKey && walletType !== 'passkey' && <CashInOut account={publicKey} />}
    </main>
  );
}
