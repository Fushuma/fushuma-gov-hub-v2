'use client';

/**
 * Network Selector Component
 * Allows users to select source and destination networks for bridging
 */

import { useState } from 'react';
import { ChevronDown, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useBridgeStore } from '@/lib/bridge/stores/bridgeStore';
import { getAllBridgeNetworks, type BridgeNetwork } from '@/lib/bridge/constants/bridgeNetworks';
import { cn } from '@/lib/utils';

interface NetworkSelectorProps {
  type: 'from' | 'to';
  disabled?: boolean;
}

export function NetworkSelector({ type, disabled }: NetworkSelectorProps) {
  const [open, setOpen] = useState(false);
  const { fromNetwork, toNetwork, setFromNetwork, setToNetwork } = useBridgeStore();
  const networks = getAllBridgeNetworks();
  
  const selectedNetwork = type === 'from' ? fromNetwork : toNetwork;
  const otherNetwork = type === 'from' ? toNetwork : fromNetwork;

  const handleSelect = (network: BridgeNetwork) => {
    if (type === 'from') {
      setFromNetwork(network);
    } else {
      setToNetwork(network);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedNetwork ? (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xs font-semibold">{selectedNetwork.symbol.substring(0, 2)}</span>
              </div>
              <span>{selectedNetwork.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select network</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2">
        <div className="space-y-1">
          {networks.map((network) => {
            const isSelected = selectedNetwork?.chainId === network.chainId;
            const isOtherNetwork = otherNetwork?.chainId === network.chainId;
            
            return (
              <button
                key={network.chainId}
                onClick={() => handleSelect(network)}
                disabled={isOtherNetwork}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isSelected && 'bg-primary/10 text-primary',
                  !isSelected && !isOtherNetwork && 'hover:bg-accent',
                  isOtherNetwork && 'cursor-not-allowed opacity-50'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xs font-semibold">{network.symbol.substring(0, 2)}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{network.name}</span>
                  <span className="text-xs text-muted-foreground">{network.symbol}</span>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function NetworkSwapButton() {
  const { fromNetwork, toNetwork, swapNetworks } = useBridgeStore();
  const canSwap = fromNetwork && toNetwork;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={swapNetworks}
      disabled={!canSwap}
      className="mx-auto"
    >
      <ArrowLeftRight className="h-4 w-4" />
    </Button>
  );
}
