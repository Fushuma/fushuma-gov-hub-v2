'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useSwitchChain } from 'wagmi';
import { Plus, Info, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { LIQUIDITY_TOKEN_LIST } from '@/lib/fumaswap/tokens';
import { FeeAmount, TICK_SPACINGS } from '@/lib/fumaswap/contracts';
import { formatFee, getFeeTierName } from '@/lib/fumaswap/pools';
import { useTokenBalance } from '@/lib/fumaswap/hooks/useTokenBalance';
import { formatTokenAmount } from '@/lib/fumaswap/utils/tokens';
import { useBalance, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Token } from '@pancakeswap/sdk';
import { parseUnits, erc20Abi } from 'viem';
import { CL_POSITION_MANAGER_ADDRESS } from '@/lib/fumaswap/contracts';

// Fushuma chain ID
const FUSHUMA_CHAIN_ID = 121224;

export function AddLiquidity() {
  const { address, isConnected, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChain } = useSwitchChain();

  // Check if user is on Fushuma network
  const isCorrectNetwork = chainId === FUSHUMA_CHAIN_ID;
  
  // Token selection (using LIQUIDITY_TOKEN_LIST which excludes native FUMA)
  const [token0, setToken0] = useState<Token | null>(LIQUIDITY_TOKEN_LIST[0]);
  const [token1, setToken1] = useState<Token | null>(LIQUIDITY_TOKEN_LIST[1]);
  
  // Fetch balances
  const { data: nativeBalance } = useBalance({ address });
  const { balance: token0Balance } = useTokenBalance(token0?.address as `0x${string}` | undefined);
  const { balance: token1Balance } = useTokenBalance(token1?.address as `0x${string}` | undefined);
  
  // Get the correct balance based on whether token is native or ERC20
  const balance0 = token0?.address === '0x0000000000000000000000000000000000000000' ? nativeBalance?.value : token0Balance;
  const balance1 = token1?.address === '0x0000000000000000000000000000000000000000' ? nativeBalance?.value : token1Balance;
  
  // Fee tier - auto-detected from pool
  const [feeTier, setFeeTier] = useState<number>(3000);
  const [poolExists, setPoolExists] = useState<boolean>(false);
  
  // Auto-detect pool based on token pair
  useEffect(() => {
    if (!token0 || !token1) {
      setPoolExists(false);
      return;
    }
    
    // Check if this token pair has an initialized pool
    const isWFUMA_USDT = 
      (token0.symbol === 'WFUMA' && token1.symbol === 'USDT') ||
      (token0.symbol === 'USDT' && token1.symbol === 'WFUMA');
    
    const isWFUMA_USDC = 
      (token0.symbol === 'WFUMA' && token1.symbol === 'USDC') ||
      (token0.symbol === 'USDC' && token1.symbol === 'WFUMA');
    
    if (isWFUMA_USDT) {
      setPoolExists(true);
      setFeeTier(3000); // 0.3% for WFUMA/USDT pool (updated November 20, 2025)
    } else if (isWFUMA_USDC) {
      setPoolExists(true);
      setFeeTier(3000); // 0.3% for WFUMA/USDC pool
    } else {
      setPoolExists(false);
    }
  }, [token0, token1]);
  
  // Amounts
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  
  // Price range
  const [priceLower, setPriceLower] = useState('');
  const [priceUpper, setPriceUpper] = useState('');
  const [currentPrice, setCurrentPrice] = useState('1.0');
  
  // Range type
  const [rangeType, setRangeType] = useState<'full' | 'custom'>('full');
  
  // Approval state
  const [isApprovingToken0, setIsApprovingToken0] = useState(false);
  const [isApprovingToken1, setIsApprovingToken1] = useState(false);
  const [approvalHash0, setApprovalHash0] = useState<`0x${string}` | undefined>();
  const [approvalHash1, setApprovalHash1] = useState<`0x${string}` | undefined>();
  
  // Wait for approval confirmations
  const { isLoading: isConfirming0, isSuccess: isSuccess0 } = useWaitForTransactionReceipt({
    hash: approvalHash0,
  });
  
  const { isLoading: isConfirming1, isSuccess: isSuccess1 } = useWaitForTransactionReceipt({
    hash: approvalHash1,
  });
  
  // Check token allowances
  const { data: allowance0, refetch: refetchAllowance0 } = useReadContract({
    address: token0?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && token0 ? [address, CL_POSITION_MANAGER_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: !!address && !!token0 },
  });
  
  const { data: allowance1, refetch: refetchAllowance1 } = useReadContract({
    address: token1?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && token1 ? [address, CL_POSITION_MANAGER_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: !!address && !!token1 },
  });
  
  // Handle approval success
  useEffect(() => {
    if (isSuccess0) {
      toast.success(`${token0?.symbol} approved successfully!`);
      setTimeout(() => {
        refetchAllowance0();
        setIsApprovingToken0(false);
        setApprovalHash0(undefined);
      }, 2000);
    }
  }, [isSuccess0, token0, refetchAllowance0]);
  
  useEffect(() => {
    if (isSuccess1) {
      toast.success(`${token1?.symbol} approved successfully!`);
      setTimeout(() => {
        refetchAllowance1();
        setIsApprovingToken1(false);
        setApprovalHash1(undefined);
      }, 2000);
    }
  }, [isSuccess1, token1, refetchAllowance1]);

  // Handle token approvals
  const handleApproveToken0 = async () => {
    if (!token0 || !amount0) return;
    
    try {
      setIsApprovingToken0(true);
      const amount = parseUnits(amount0, token0.decimals);
      
      const hash = await writeContractAsync({
        address: token0.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CL_POSITION_MANAGER_ADDRESS as `0x${string}`, amount],
      });
      
      setApprovalHash0(hash);
      toast.info(`Waiting for ${token0.symbol} approval confirmation...`);
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve token');
      setIsApprovingToken0(false);
    }
  };
  
  const handleApproveToken1 = async () => {
    if (!token1 || !amount1) return;
    
    try {
      setIsApprovingToken1(true);
      const amount = parseUnits(amount1, token1.decimals);
      
      const hash = await writeContractAsync({
        address: token1.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CL_POSITION_MANAGER_ADDRESS as `0x${string}`, amount],
      });
      
      setApprovalHash1(hash);
      toast.info(`Waiting for ${token1.symbol} approval confirmation...`);
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve token');
      setIsApprovingToken1(false);
    }
  };
  
  // Check if tokens need approval
  const needsApproval0 = () => {
    console.log('needsApproval0 check:', { amount0, token0: token0?.symbol, allowance0: allowance0?.toString() });
    if (!amount0 || !token0) {
      console.log('needsApproval0: false (no amount or token)');
      return false;
    }
    if (!allowance0) {
      console.log('needsApproval0: true (allowance undefined)');
      return true;
    }
    const amount = parseUnits(amount0, token0.decimals);
    const needs = BigInt(allowance0) < amount;
    console.log('needsApproval0:', needs, 'allowance:', allowance0.toString(), 'needed:', amount.toString());
    return needs;
  };
  
  const needsApproval1 = () => {
    console.log('needsApproval1 check:', { amount1, token1: token1?.symbol, allowance1: allowance1?.toString() });
    if (!amount1 || !token1) {
      console.log('needsApproval1: false (no amount or token)');
      return false;
    }
    if (!allowance1) {
      console.log('needsApproval1: true (allowance undefined)');
      return true;
    }
    const amount = parseUnits(amount1, token1.decimals);
    const needs = BigInt(allowance1) < amount;
    console.log('needsApproval1:', needs, 'allowance:', allowance1.toString(), 'needed:', amount.toString());
    return needs;
  };

  const handleAddLiquidity = async () => {
    console.log('=== ADD LIQUIDITY DEBUG START ===');
    console.log('Timestamp:', new Date().toISOString());
    
    if (!isConnected || !address) {
      console.error('❌ Wallet not connected');
      toast.error('Please connect your wallet');
      return;
    }
    
    console.log('✅ Wallet connected:', address);
    console.log('Token0:', token0?.symbol, token0?.address);
    console.log('Token1:', token1?.symbol, token1?.address);
    console.log('Amount0:', amount0);
    console.log('Amount1:', amount1);
    console.log('Fee tier:', feeTier);
    console.log('Range type:', rangeType);
    
    if (!token0 || !token1) {
      console.error('❌ Tokens not selected');
      toast.error('Please select both tokens');
      return;
    }
    
    if (!amount0 || !amount1) {
      console.error('❌ Amounts not entered');
      toast.error('Please enter amounts for both tokens');
      return;
    }
    
    try {
      console.log('📦 Importing libraries...');
      // Import required functions
      const { addLiquidity, getFullRangeTickRange, validateLiquidityParams } = await import('@/lib/fumaswap/liquidity');
      const { parseUnits } = await import('viem');
      const { TICK_SPACINGS } = await import('@/lib/fumaswap/contracts');
      console.log('✅ Libraries imported successfully');
      
      // Parse amounts
      console.log('💰 Parsing amounts...');
      const amount0Desired = parseUnits(amount0, token0.decimals);
      const amount1Desired = parseUnits(amount1, token1.decimals);
      console.log('Amount0 parsed:', amount0Desired.toString(), 'wei');
      console.log('Amount1 parsed:', amount1Desired.toString(), 'wei');
      
      // Validate parameters
      console.log('✔️  Validating parameters...');
      const validation = validateLiquidityParams(token0, token1, amount0, amount1);
      if (!validation.valid) {
        console.error('❌ Validation failed:', validation.error);
        toast.error(validation.error);
        return;
      }
      console.log('✅ Validation passed');
      
      // Calculate minimum amounts with 0.5% slippage
      const amount0Min = (amount0Desired * 995n) / 1000n;
      const amount1Min = (amount1Desired * 995n) / 1000n;
      console.log('📊 Slippage amounts calculated:');
      console.log('  Amount0 min:', amount0Min.toString(), 'wei');
      console.log('  Amount1 min:', amount1Min.toString(), 'wei');
      
      // Calculate ticks based on range type
      let tickLower: number;
      let tickUpper: number;
      
      console.log('📐 Calculating ticks...');
      if (rangeType === 'full') {
        const fullRange = getFullRangeTickRange(feeTier);
        tickLower = fullRange.tickLower;
        tickUpper = fullRange.tickUpper;
        console.log('✅ Full range ticks:', { tickLower, tickUpper });
      } else {
        // For custom range, convert prices to ticks
        const tickSpacing = TICK_SPACINGS[feeTier];

        // Parse price inputs
        const minPrice = parseFloat(priceLower) || 0;
        const maxPrice = parseFloat(priceUpper) || Number.MAX_SAFE_INTEGER;

        if (minPrice <= 0 || maxPrice <= 0 || minPrice >= maxPrice) {
          toast.error('Please enter valid price range (min must be less than max)');
          return;
        }

        // Convert prices to ticks using: tick = log(price) / log(1.0001)
        const rawTickLower = Math.floor(Math.log(minPrice) / Math.log(1.0001));
        const rawTickUpper = Math.ceil(Math.log(maxPrice) / Math.log(1.0001));

        // Round to nearest tick spacing
        tickLower = Math.ceil(rawTickLower / tickSpacing) * tickSpacing;
        tickUpper = Math.floor(rawTickUpper / tickSpacing) * tickSpacing;

        // Clamp to valid tick range
        const MIN_TICK = Math.ceil(-887272 / tickSpacing) * tickSpacing;
        const MAX_TICK = Math.floor(887272 / tickSpacing) * tickSpacing;
        tickLower = Math.max(tickLower, MIN_TICK);
        tickUpper = Math.min(tickUpper, MAX_TICK);

        console.log('✅ Custom range ticks:', {
          tickLower,
          tickUpper,
          tickSpacing,
          minPrice,
          maxPrice,
        });
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
        deadline: 20, // 20 minutes from now
      };
      
      console.log('📋 Liquidity params prepared:');
      console.log(JSON.stringify({
        token0: token0.symbol,
        token1: token1.symbol,
        fee: feeTier,
        amount0Desired: amount0Desired.toString(),
        amount1Desired: amount1Desired.toString(),
        amount0Min: amount0Min.toString(),
        amount1Min: amount1Min.toString(),
        tickLower,
        tickUpper,
        recipient: address,
        deadline: liquidityParams.deadline,
      }, null, 2));
      
      // Execute add liquidity
      console.log('🚀 Calling addLiquidity function...');
      const result = await addLiquidity(liquidityParams, writeContractAsync);
      console.log('✅ AddLiquidity returned:', result);
      
      if (result) {
        console.log('✅ Transaction hash:', result.hash);
        toast.success('Liquidity added successfully!');
        setAmount0('');
        setAmount1('');
      }
    } catch (error: any) {
      console.error('=== ❌ ADD LIQUIDITY ERROR ===');
      console.error('Error type:', error?.constructor?.name || 'Unknown');
      console.error('Error message:', error?.message || 'No message');
      console.error('Error stack:', error?.stack || 'No stack trace');
      
      // Log additional error properties
      if (error?.cause) {
        console.error('Error cause:', error.cause);
      }
      if (error?.data) {
        console.error('Error data:', error.data);
      }
      if (error?.reason) {
        console.error('Error reason:', error.reason);
      }
      if (error?.code) {
        console.error('Error code:', error.code);
      }
      if (error?.shortMessage) {
        console.error('Short message:', error.shortMessage);
      }
      
      // Log the full error object (with BigInt support)
      console.error('Full error object:', JSON.stringify(error, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2));
      
      // User-friendly error message
      let userMessage = 'Failed to add liquidity';
      if (error?.message) {
        if (error.message.includes('user rejected')) {
          userMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('insufficient funds')) {
          userMessage = 'Insufficient funds for transaction';
        } else if (error.message.includes('gas')) {
          userMessage = 'Gas estimation failed - check token balances and approvals';
        } else {
          userMessage = error.message;
        }
      }
      
      toast.error(userMessage + ' - Check console for details');
      console.error('=== ADD LIQUIDITY ERROR END ===');
    } finally {
      console.log('=== ADD LIQUIDITY DEBUG END ===');
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
        {/* Network Warning */}
        {isConnected && !isCorrectNetwork && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col gap-3">
                <span>
                  You are connected to the wrong network. Liquidity pools are only available on Fushuma Network.
                </span>
                <Button
                  onClick={() => switchChain({ chainId: FUSHUMA_CHAIN_ID })}
                  variant="outline"
                  size="sm"
                  className="w-fit"
                >
                  Switch to Fushuma Network
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Token Pair Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Token A</Label>
            <Select
              value={token0?.symbol}
              onValueChange={(symbol) => {
                const token = LIQUIDITY_TOKEN_LIST.find((t) => t.symbol === symbol);
                if (token) setToken0(token);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIQUIDITY_TOKEN_LIST.map((token) => (
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
                const token = LIQUIDITY_TOKEN_LIST.find((t) => t.symbol === symbol);
                if (token) setToken1(token);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIQUIDITY_TOKEN_LIST.map((token) => (
                  <SelectItem key={token.address} value={token.symbol!}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Fee Tier - Auto-detected from pool */}
        <div className="space-y-2">
          <Label>Pool Fee Tier</Label>
          {poolExists ? (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">0.30%</span>
                <Badge variant="secondary">Pool Found</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ✓ Pool exists for {token0?.symbol}/{token1?.symbol} pair with 0.30% fee tier
              </p>
            </div>
          ) : (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-destructive">No Pool</span>
                <Badge variant="destructive">Not Available</Badge>
              </div>
              <p className="text-xs text-destructive mt-2">
                ✗ No pool exists for this token pair. Please select WFUMA/USDT or WFUMA/USDC.
              </p>
            </div>
          )}
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
                    Balance: {formatTokenAmount(balance0, token0.decimals, 2)} {token0.symbol}
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
                    Balance: {formatTokenAmount(balance1, token1.decimals, 2)} {token1.symbol}
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
                <span className="font-medium">0.30%</span>
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
                  {rangeType === 'full' ? 'Variable' : 'Higher with narrow range'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                APR depends on trading volume and fee earnings. Concentrated positions earn more when in range.
              </p>
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
        
        {/* Approval and Add Liquidity Buttons */}
        <div className="space-y-3">
          {/* Token 0 Approval */}
          {(() => {
            const shouldShow = isConnected && amount0 && token0 && needsApproval0();
            console.log('Token0 approval button shouldShow:', shouldShow, { isConnected, amount0, token0: token0?.symbol, needsApproval: needsApproval0() });
            return shouldShow;
          })() && (
            <Button
              onClick={handleApproveToken0}
              disabled={isApprovingToken0 || isConfirming0}
              className="w-full"
              size="lg"
              variant="outline"
            >
              {isApprovingToken0 || isConfirming0 ? 'Approving...' : `Approve ${token0?.symbol || 'Token'}`}
            </Button>
          )}
          
          {/* Token 1 Approval */}
          {isConnected && amount1 && token1 && needsApproval1() && (
            <Button
              onClick={handleApproveToken1}
              disabled={isApprovingToken1 || isConfirming1}
              className="w-full"
              size="lg"
              variant="outline"
            >
              {isApprovingToken1 || isConfirming1 ? 'Approving...' : `Approve ${token1?.symbol || 'Token'}`}
            </Button>
          )}
          
          {/* Add Liquidity Button */}
            <Button
              onClick={handleAddLiquidity}
              disabled={
                !isConnected ||
                !isCorrectNetwork ||
                !token0 ||
                !token1 ||
                !amount0 ||
                !amount1 ||
                !poolExists ||
                needsApproval0() ||
                needsApproval1() ||
                isApprovingToken0 ||
                isApprovingToken1 ||
                isConfirming0 ||
                isConfirming1
              }
              className="w-full"
              size="lg"
            >
            <Plus className="h-4 w-4 mr-2" />
            {!isConnected ? 'Connect Wallet' :
             !isCorrectNetwork ? 'Switch to Fushuma Network' :
             (needsApproval0() || needsApproval1()) ? 'Approve tokens first' :
             'Add Liquidity'}
          </Button>
        </div>
        
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

