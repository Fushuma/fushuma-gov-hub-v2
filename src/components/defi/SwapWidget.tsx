'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ArrowDownUp, Settings, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { DEFAULT_TOKEN_LIST } from '@/lib/pancakeswap/tokens';
import { validateSwapParams, formatPrice } from '@/lib/pancakeswap/swap';
import type { Token } from '@pancakeswap/sdk';

export function SwapWidget() {
  const { address, isConnected } = useAccount();
  
  // Token selection
  const [tokenIn, setTokenIn] = useState<Token | null>(DEFAULT_TOKEN_LIST[0]);
  const [tokenOut, setTokenOut] = useState<Token | null>(DEFAULT_TOKEN_LIST[1]);
  
  // Amounts
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  
  // Swap settings
  const [slippage, setSlippage] = useState(50); // 0.5% in basis points
  const [deadline, setDeadline] = useState(20); // 20 minutes
  
  // Quote data
  const [priceImpact, setPriceImpact] = useState('0');
  const [executionPrice, setExecutionPrice] = useState('0');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  
  // Swap tokens
  const handleSwapTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  };
  
  // Get quote when amount changes
  useEffect(() => {
    const getQuote = async () => {
      if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
        setAmountOut('');
        return;
      }
      
      setIsLoadingQuote(true);
      
      try {
        // TODO: Implement actual quote fetching from smart contracts
        // For now, using placeholder logic
        const mockRate = 1.5; // Mock exchange rate
        const calculatedOut = (parseFloat(amountIn) * mockRate).toFixed(6);
        setAmountOut(calculatedOut);
        setPriceImpact('0.15');
        setExecutionPrice(mockRate.toString());
      } catch (error) {
        console.error('Error fetching quote:', error);
        toast.error('Failed to fetch quote');
      } finally {
        setIsLoadingQuote(false);
      }
    };
    
    const debounce = setTimeout(getQuote, 500);
    return () => clearTimeout(debounce);
  }, [amountIn, tokenIn, tokenOut]);
  
  // Execute swap
  const handleSwap = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!tokenIn || !tokenOut) {
      toast.error('Please select both tokens');
      return;
    }
    
    const validation = validateSwapParams(tokenIn, tokenOut, amountIn);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    try {
      toast.info('Swap functionality will be available after contract deployment');
      // TODO: Implement actual swap execution
      // 1. Approve tokens if needed
      // 2. Execute swap through InfinityRouter
      // 3. Wait for transaction confirmation
      // 4. Show success message
    } catch (error) {
      console.error('Swap error:', error);
      toast.error('Swap failed');
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Swap</CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <Label>Slippage Tolerance</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Slider
                      value={[slippage]}
                      onValueChange={([value]) => setSlippage(value)}
                      min={10}
                      max={500}
                      step={10}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-16 text-right">
                      {(slippage / 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label>Transaction Deadline</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      value={deadline}
                      onChange={(e) => setDeadline(parseInt(e.target.value) || 20)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Token In */}
        <div className="space-y-2">
          <Label>From</Label>
          <div className="flex gap-2">
            <Select
              value={tokenIn?.symbol}
              onValueChange={(symbol) => {
                const token = DEFAULT_TOKEN_LIST.find((t) => t.symbol === symbol);
                if (token) setTokenIn(token);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TOKEN_LIST.map((token) => (
                  <SelectItem key={token.address} value={token.symbol!}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className="flex-1"
            />
          </div>
          
          {isConnected && tokenIn && (
            <p className="text-xs text-muted-foreground">
              Balance: 0.00 {tokenIn.symbol}
            </p>
          )}
        </div>
        
        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwapTokens}
            className="rounded-full"
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Token Out */}
        <div className="space-y-2">
          <Label>To</Label>
          <div className="flex gap-2">
            <Select
              value={tokenOut?.symbol}
              onValueChange={(symbol) => {
                const token = DEFAULT_TOKEN_LIST.find((t) => t.symbol === symbol);
                if (token) setTokenOut(token);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TOKEN_LIST.map((token) => (
                  <SelectItem key={token.address} value={token.symbol!}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="number"
              placeholder="0.0"
              value={amountOut}
              readOnly
              className="flex-1 bg-muted"
            />
          </div>
          
          {isLoadingQuote && (
            <p className="text-xs text-muted-foreground">Fetching quote...</p>
          )}
        </div>
        
        {/* Quote Details */}
        {amountOut && parseFloat(amountOut) > 0 && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-medium">
                1 {tokenIn?.symbol} = {formatPrice(parseFloat(executionPrice))} {tokenOut?.symbol}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price Impact</span>
              <Badge variant={parseFloat(priceImpact) > 1 ? 'destructive' : 'secondary'}>
                {priceImpact}%
              </Badge>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minimum Received</span>
              <span className="font-medium">
                {(parseFloat(amountOut) * (1 - slippage / 10000)).toFixed(6)} {tokenOut?.symbol}
              </span>
            </div>
            
            <Separator />
            
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Output is estimated. You will receive at least the minimum amount or the transaction will revert.
              </span>
            </div>
          </div>
        )}
        
        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!isConnected || !amountIn || !amountOut || isLoadingQuote}
          className="w-full"
          size="lg"
        >
          {!isConnected ? 'Connect Wallet' : 'Swap'}
        </Button>
        
        {/* FUMA Holder Benefit */}
        {isConnected && (
          <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">FUMA Holder Benefit</p>
                <p className="text-muted-foreground mt-1">
                  Hold 100+ FUMA tokens to get up to 50% discount on swap fees!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

