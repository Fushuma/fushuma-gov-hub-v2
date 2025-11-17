'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { ArrowDownUp, Settings, Info, Loader2 } from 'lucide-react';
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
import { DEFAULT_TOKEN_LIST, isPlaceholderAddress } from '@/lib/fumaswap/tokens';
import { getSwapQuote, validateSwapParams, formatPrice, calculateMinimumOutput, executeSwap } from '@/lib/fumaswap/swap';
import { UNIVERSAL_ROUTER_ADDRESS } from '@/lib/fumaswap/contracts';
import { parseUnits } from 'viem';
import { useTokenBalance } from '@/lib/fumaswap/hooks/useTokenBalance';
import { formatTokenAmount } from '@/lib/fumaswap/utils/tokens';
import type { Token } from '@pancakeswap/sdk';
import type { SwapQuote } from '@/lib/fumaswap/swap';

export function SwapWidget() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  // Token selection
  const [tokenIn, setTokenIn] = useState<Token | null>(DEFAULT_TOKEN_LIST[0]);
  const [tokenOut, setTokenOut] = useState<Token | null>(DEFAULT_TOKEN_LIST[1]);
  
  // Amounts
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  
  // Swap settings
  const [slippage, setSlippage] = useState(50); // 0.5% in basis points (50 = 0.5%)
  const [deadline, setDeadline] = useState(20); // 20 minutes
  
  // Quote data
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  
  // Token approval
  const [needsApproval, setNeedsApproval] = useState(false);
  const { writeContractAsync: approveToken } = useWriteContract();
  
  // Token balances
  const { balance: balanceIn } = useTokenBalance(
    tokenIn && !isPlaceholderAddress(tokenIn.address) ? tokenIn.address as `0x${string}` : undefined
  );
  
  // Swap tokens
  const handleSwapTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  };
  
  // Check token allowance
  const { data: allowance } = useReadContract({
    address: tokenIn?.address as `0x${string}`,
    abi: [{
      name: 'allowance',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' }
      ],
      outputs: [{ name: '', type: 'uint256' }]
    }],
    functionName: 'allowance',
    args: address && tokenIn ? [address, UNIVERSAL_ROUTER_ADDRESS as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!tokenIn && tokenIn.address !== '0x0000000000000000000000000000000000000000',
    },
  });
  
  // Check if approval is needed
  useEffect(() => {
    if (!amountIn || !tokenIn || !allowance) {
      setNeedsApproval(false);
      return;
    }
    
    try {
      const amountInWei = parseUnits(amountIn, tokenIn.decimals);
      setNeedsApproval(BigInt(allowance.toString()) < amountInWei);
    } catch {
      setNeedsApproval(false);
    }
  }, [amountIn, tokenIn, allowance]);
  
  // Get quote when amount changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
        setAmountOut('');
        setQuote(null);
        return;
      }
      
      setIsLoadingQuote(true);
      
      try {
        const swapQuote = await getSwapQuote(tokenIn, tokenOut, amountIn);
        
        if (swapQuote) {
          setQuote(swapQuote);
          setAmountOut(swapQuote.outputAmount);
        }
      } catch (error) {
        console.error('Error fetching quote:', error);
        toast.error('Failed to fetch quote');
      } finally {
        setIsLoadingQuote(false);
      }
    };
    
    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [amountIn, tokenIn, tokenOut]);
  
  // Handle token approval
  const handleApprove = async () => {
    if (!isConnected || !address || !tokenIn) {
      toast.error('Please connect your wallet');
      return;
    }
    
    try {
      const amountInWei = parseUnits(amountIn, tokenIn.decimals);
      
      await approveToken({
        address: tokenIn.address as `0x${string}`,
        abi: [{
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }],
        functionName: 'approve',
        args: [UNIVERSAL_ROUTER_ADDRESS as `0x${string}`, amountInWei],
      });
      
      toast.success('Token approved successfully!');
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve token');
    }
  };
  
  // Execute swap
  const handleSwap = async () => {
    if (!isConnected || !address) {
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
      // Execute swap
      const swapParams = {
        tokenIn,
        tokenOut,
        amountIn,
        slippageTolerance: slippage / 100, // Convert basis points to percentage
        deadline,
        recipient: address,
      };
      
      const result = await executeSwap(swapParams, writeContractAsync);
      
      if (result) {
        toast.success('Swap executed successfully!');
        setAmountIn('');
        setAmountOut('');
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      toast.error(error.message || 'Failed to execute swap');
    }
  };
  
  const minimumReceived = quote ? calculateMinimumOutput(quote.outputAmount, slippage / 100) : '0';
  
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
                      onValueChange={(value) => setSlippage(value[0])}
                      min={1}
                      max={500}
                      step={1}
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
                      min={1}
                      max={60}
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
        {/* Input Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>From</Label>
            {isConnected && balanceIn !== undefined && (
              <span className="text-xs text-muted-foreground">
                Balance: {formatTokenAmount(balanceIn, tokenIn?.decimals)}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className="flex-1"
            />
            <Select
              value={tokenIn?.symbol}
              onValueChange={(symbol) => {
                const token = DEFAULT_TOKEN_LIST.find((t) => t.symbol === symbol);
                if (token) setTokenIn(token);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TOKEN_LIST.map((token) => (
                  <SelectItem key={token.address} value={token.symbol!}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        
        {/* Output Token */}
        <div className="space-y-2">
          <Label>To</Label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amountOut}
                readOnly
                className="pr-8"
              />
              {isLoadingQuote && (
                <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            <Select
              value={tokenOut?.symbol}
              onValueChange={(symbol) => {
                const token = DEFAULT_TOKEN_LIST.find((t) => t.symbol === symbol);
                if (token) setTokenOut(token);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TOKEN_LIST.map((token) => (
                  <SelectItem key={token.address} value={token.symbol!}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Quote Details */}
        {quote && amountOut && (
          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-medium">
                1 {tokenIn?.symbol} = {formatPrice(parseFloat(quote.outputAmount) / parseFloat(quote.inputAmount))} {tokenOut?.symbol}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Impact</span>
              <span className={`font-medium ${quote.priceImpact > 1 ? 'text-orange-500' : 'text-green-500'}`}>
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-medium">{quote.fee}%</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minimum Received</span>
              <span className="font-medium">
                {minimumReceived} {tokenOut?.symbol}
              </span>
            </div>
          </div>
        )}
        
        {/* FUMA Holder Benefit */}
        <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
          <div className="flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-primary">FUMA Holder Benefit</p>
              <p className="text-muted-foreground mt-1">
                Hold FUMA or WFUMA tokens to receive reduced trading fees on all swaps.
              </p>
            </div>
          </div>
        </div>
        
        {/* Approval/Swap Button */}
        {needsApproval ? (
          <Button
            onClick={handleApprove}
            disabled={!isConnected || !amountIn}
            className="w-full"
            size="lg"
          >
            Approve {tokenIn?.symbol}
          </Button>
        ) : (
          <Button
            onClick={handleSwap}
            disabled={!isConnected || !amountIn || !amountOut || isLoadingQuote}
            className="w-full"
            size="lg"
          >
            {!isConnected ? 'Connect Wallet' : isLoadingQuote ? 'Loading...' : 'Swap'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
