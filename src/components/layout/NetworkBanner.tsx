'use client';

/**
 * Warns when the connected wallet is on a non-Fushuma chain.
 *
 * The wagmi config includes the bridge's source chains (Ethereum, BSC,
 * Polygon, Arbitrum, Base, Unichain), so a wallet can legitimately be on
 * another network while bridging - but governance, grants and FumaSwap
 * transactions all require Fushuma. Hidden on bridge routes.
 */

import { usePathname } from 'next/navigation';
import { useAccount, useSwitchChain } from 'wagmi';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FUSHUMA_CHAIN_ID } from '@/lib/web3/config';

export function NetworkBanner() {
  const pathname = usePathname();
  const { isConnected, chainId, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const onBridgeRoute = pathname?.startsWith('/defi/bridge');

  if (!isConnected || !chainId || chainId === FUSHUMA_CHAIN_ID || onBridgeRoute) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-sm">
      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
      <span>
        Your wallet is connected to {chain?.name ?? `chain ${chainId}`}.
        Transactions on this page require the Fushuma network.
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => switchChain({ chainId: FUSHUMA_CHAIN_ID })}
      >
        {isPending ? 'Switching…' : 'Switch to Fushuma'}
      </Button>
    </div>
  );
}
