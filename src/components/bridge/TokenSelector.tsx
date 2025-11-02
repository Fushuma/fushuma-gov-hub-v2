'use client';

/**
 * Token Selector Component
 * Allows users to select tokens for bridging
 */

import { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useBridgeStore } from '@/lib/bridge/stores/bridgeStore';
import { getAllBridgeTokens, getTokensByChain, type BridgeToken } from '@/lib/bridge/constants/bridgeTokens';
import { useBridgeBalance } from '@/lib/bridge/hooks/useBridgeBalance';
import { cn } from '@/lib/utils';

interface TokenSelectorProps {
  disabled?: boolean;
}

export function TokenSelector({ disabled }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { selectedToken, fromNetwork, setSelectedToken } = useBridgeStore();

  // Get tokens available on the selected network
  const availableTokens = useMemo(() => {
    if (!fromNetwork) return getAllBridgeTokens();
    return getTokensByChain(fromNetwork.chainId);
  }, [fromNetwork]);

  // Filter tokens by search
  const filteredTokens = useMemo(() => {
    if (!search) return availableTokens;
    const searchLower = search.toLowerCase();
    return availableTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(searchLower) ||
        token.name.toLowerCase().includes(searchLower)
    );
  }, [availableTokens, search]);

  const handleSelect = (token: BridgeToken) => {
    setSelectedToken(token);
    setOpen(false);
    setSearch('');
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
          {selectedToken ? (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xs font-semibold">{selectedToken.symbol.substring(0, 1)}</span>
              </div>
              <span>{selectedToken.symbol}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select token</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-2">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[300px] space-y-1 overflow-y-auto">
            {filteredTokens.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No tokens found
              </div>
            ) : (
              filteredTokens.map((token) => (
                <TokenItem
                  key={token.symbol}
                  token={token}
                  isSelected={selectedToken?.symbol === token.symbol}
                  onSelect={handleSelect}
                  chainId={fromNetwork?.chainId}
                />
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TokenItemProps {
  token: BridgeToken;
  isSelected: boolean;
  onSelect: (token: BridgeToken) => void;
  chainId?: number;
}

function TokenItem({ token, isSelected, onSelect, chainId }: TokenItemProps) {
  const tokenAddress = chainId ? token.address[chainId] : undefined;
  const tokenDecimals = chainId ? token.decimals[chainId] : 18;
  const { balance } = useBridgeBalance(
    tokenAddress && (tokenAddress as string) !== '' ? (tokenAddress as `0x${string}`) : undefined,
    tokenDecimals
  );

  return (
    <button
      onClick={() => onSelect(token)}
      className={cn(
        'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
        isSelected && 'bg-primary/10 text-primary',
        !isSelected && 'hover:bg-accent'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <span className="text-xs font-semibold">{token.symbol.substring(0, 1)}</span>
        </div>
        <div className="flex flex-col items-start">
          <span className="font-medium">{token.symbol}</span>
          <span className="text-xs text-muted-foreground">{token.name}</span>
        </div>
      </div>
      {chainId && (
        <span className="text-xs text-muted-foreground">
          {parseFloat(balance).toFixed(4)}
        </span>
      )}
    </button>
  );
}
