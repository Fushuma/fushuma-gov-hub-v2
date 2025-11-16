'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Plus, Info, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { DEFAULT_TOKEN_LIST } from '@/lib/fumaswap/tokens';
import { FeeAmount, TICK_SPACINGS } from '@/lib/fumaswap/contracts';
import { formatFee, getFeeTierName } from '@/lib/fumaswap/pools';
import type { Token } from '@pancakeswap/sdk';

export function AddLiquidity() {
  const { address, isConnected } = useAccount();
  
  // Token selection
  const [token0, setToken0] = useState<Token | null>(DEFAULT_TOKEN_LIST[0]);
  const [token1, setToken1] = useState<Token | null>(DEFAULT_TOKEN_LIST[1]);
  
  // Fee tier
  const [feeTier, setFeeTier] = useState<FeeAmount>(FeeAmount.MEDIUM);
  
  // Amounts
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  
  // Price range
  const [priceLower, setPriceLower] = useState('');
  const [priceUpper, setPriceUpper] = useState('');
  const [currentPrice, setCurrentPrice] = useState('1.0');
  
  // Range type
  const [rangeType, setRangeType] = useState<'full' | 'custom'>('full');
  
  const handleAddLiquidity = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!token0 || !token1) {
      toast.error('Please select both tokens');
      return;
    }
    
    if (!amount0 || !amount1) {
      toast.error('Please enter amounts for both tokens');
      return;
    }
    
    try {
      toast.loading('Adding liquidity...', { id: 'liquidity-loading' });
      
      // Import required functions
      const { writeContractAsync } = await import('wagmi/actions');
      const { wagmiConfig } = await import('@/lib/web3/config');
      const { addLiquidity, calculateTicksFromPrices, getFullRangeTicks, calculateMinAmounts } = await import('@/lib/fumaswap/liquidity');
      const { parseUnits } = await import('viem');
      const { TICK_SPACINGS } = await import('@/lib/fumaswap/contracts');
      
      // Parse amounts
      const amount0Desired = parseUnits(amount0, token0.decimals);
      const amount1Desired = parseUnits(amount1, token1.decimals);
      
      // Calculate minimum amounts with 0.5% slippage
      const { amount0Min, amount1Min } = calculateMinAmounts(amount0Desired, amount1Desired, 0.5);
      
      // Calculate ticks based on range type
      let tickLower: number;
      let tickUpper: number;
      
      if (rangeType === 'full') {
        const fullRange = getFullRangeTicks(TICK_SPACINGS[feeTier]);
        tickLower = fullRange.tickLower;
        tickUpper = fullRange.tickUpper;
      } else {
        const priceL = parseFloat(priceLower) || 0.5;
        const priceU = parseFloat(priceUpper) || 2.0;
        const ticks = calculateTicksFromPrices(priceL, priceU, TICK_SPACINGS[feeTier]);
        tickLower = ticks.tickLower;
        tickUpper = ticks.tickUpper;
      }
      
      // Prepare liquidity params
      const liquidityParams = {
        token0,
        token1,
        fee: feeTier,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        tickLower,
        tickUpper,
        recipient: address,
        deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
      };
      
      // Execute add liquidity
      const result = await addLiquidity(liquidityParams, (args: any) => 
        writeContractAsync(wagmiConfig, args)
      );
      
      if (result) {
        toast.success('Liquidity added successfully!', { id: 'liquidity-loading' });
        setAmount0('');
        setAmount1('');
      }
    } catch (error: any) {
      console.error('Add liquidity error:', error);
      toast.error(error.message || 'Failed to add liquidity', { id: 'liquidity-loading' });
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Liquidity</CardTitle>
        <CardDescription>
          Provide liquidity to earn trading fees. Choose concentrated liquidity for higher capital efficiency.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Token Pair Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Token A</Label>
            <Select
              value={token0?.symbol}
              onValueChange={(symbol) => {
                const token = DEFAULT_TOKEN_LIST.find((t) => t.symbol === symbol);
                if (token) setToken0(token);
              }}
            >
              <SelectTrigger>
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
          
          <div className="space-y-2">
            <Label>Token B</Label>
            <Select
              value={token1?.symbol}
              onValueChange={(symbol) => {
                const token = DEFAULT_TOKEN_LIST.find((t) => t.symbol === symbol);
                if (token) setToken1(token);
              }}
            >
              <SelectTrigger>
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
        
        {/* Fee Tier Selection */}
        <div className="space-y-2">
          <Label>Fee Tier</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.values(FeeAmount)
              .filter((v) => typeof v === 'number')
              .map((fee) => (
                <Button
                  key={fee}
                  variant={feeTier === fee ? 'default' : 'outline'}
                  onClick={() => setFeeTier(fee as FeeAmount)}
                  className="flex flex-col h-auto py-3"
                >
                  <span className="font-bold">{formatFee(fee as FeeAmount)}</span>
                  <span className="text-xs mt-1 opacity-80">
                    {getFeeTierName(fee as FeeAmount).split(' ').slice(2).join(' ')}
                  </span>
                </Button>
              ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Price Range Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Price Range</Label>
            <Tabs value={rangeType} onValueChange={(v) => setRangeType(v as 'full' | 'custom')}>
              <TabsList>
                <TabsTrigger value="full">Full Range</TabsTrigger>
                <TabsTrigger value="custom">Custom Range</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {rangeType === 'custom' && (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold mt-1">
                  {currentPrice} {token1?.symbol} per {token0?.symbol}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Price</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={priceLower}
                    onChange={(e) => setPriceLower(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {token1?.symbol} per {token0?.symbol}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Max Price</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={priceUpper}
                    onChange={(e) => setPriceUpper(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {token1?.symbol} per {token0?.symbol}
                  </p>
                </div>
              </div>
              
              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-start gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Concentrated Liquidity</p>
                    <p className="text-muted-foreground mt-1">
                      Your liquidity will only earn fees when the price is within your selected range.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {rangeType === 'full' && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Your liquidity will be active at all price levels (0 to ∞)
              </p>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Deposit Amounts */}
        <div className="space-y-4">
          <Label>Deposit Amounts</Label>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                />
                {isConnected && token0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance: 0.00 {token0.symbol}
                  </p>
                )}
              </div>
              <div className="w-20 flex items-center justify-center">
                <Badge variant="secondary">{token0?.symbol}</Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                />
                {isConnected && token1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance: 0.00 {token1.symbol}
                  </p>
                )}
              </div>
              <div className="w-20 flex items-center justify-center">
                <Badge variant="secondary">{token1?.symbol}</Badge>
              </div>
            </div>
          </div>
        </div>
        
        {/* Position Summary */}
        {amount0 && amount1 && (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="font-medium">Position Summary</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee Tier</span>
                <span className="font-medium">{formatFee(feeTier)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Range</span>
                <span className="font-medium">
                  {rangeType === 'full' ? 'Full Range' : 'Custom Range'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated APR</span>
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  15.5%
                </Badge>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                You will receive an NFT representing your liquidity position. This NFT can be used to manage or remove your liquidity.
              </span>
            </div>
          </div>
        )}
        
        {/* Add Liquidity Button */}
        <Button
          onClick={handleAddLiquidity}
          disabled={!isConnected || !amount0 || !amount1}
          className="w-full"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          {!isConnected ? 'Connect Wallet' : 'Add Liquidity'}
        </Button>
        
        {/* Launchpad Integration */}
        <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">Launchpad Integration</p>
              <p className="text-muted-foreground mt-1">
                Creating a pool for a launchpad token? Liquidity will be automatically locked for the specified duration.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

