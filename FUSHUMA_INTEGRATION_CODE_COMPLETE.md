# Fushuma DeFi - Complete Integration Code Documentation

**Date:** November 19, 2025  
**Frontend Framework:** Next.js 14 + React  
**Web3 Libraries:** Wagmi + Viem  
**Network:** Fushuma Mainnet (Chain ID: 121224)

---

## Table of Contents

1. [Configuration & Setup](#1-configuration--setup)
2. [UniversalRouter Integration](#2-universalrouter-integration)
3. [CLQuoter Integration](#3-clquoter-integration)
4. [CLPositionManager Integration](#4-clpositionmanager-integration)
5. [CLPoolManager Integration](#5-clpoolmanager-integration)
6. [Vault Integration](#6-vault-integration)
7. [Utility Functions](#7-utility-functions)

---

## 1. Configuration & Setup

### Contract Addresses Configuration

**File:** `src/lib/fumaswap/contracts.ts`

```typescript
/**
 * FumaSwap V4 Contract Addresses on Fushuma Network
 * 
 * Shanghai EVM + Solidity 0.8.20 - Deployed Nov 18, 2025
 * Complete redeployment with Shanghai EVM compatibility
 * All contracts deployed and operational including Universal Router
 */

export const FUSHUMA_CONTRACTS = {
  // Core Contracts (Shanghai EVM + Solidity 0.8.20)
  vault: '0xcf842B77660ccEBD24fB3f860Ab2304c5B9F5A4E', // ✅ Deployed (Shanghai)
  clPoolManager: '0xef02f995FEC090E21709A7eBAc2197d249B1a605', // ✅ Deployed (Shanghai)
  binPoolManager: '0xCF6C0074c43C00234cC83D0f009B1db933EbF280', // ✅ Deployed (Shanghai)
  
  // Periphery Contracts - Concentrated Liquidity
  clQuoter: '0x9a554202Ff6E62e5533D394330D0A4B57efF7C7a', // ✅ Deployed (Shanghai)
  clPositionDescriptor: '0x8349289AC7c186b79783Bf77D35A42B78b1Dd1dE', // ✅ Deployed (Shanghai)
  clPositionManager: '0xd61D426f27E83dcD7CD37D31Ea53BCaE4aDa501E', // ✅ Deployed (Shanghai)
  
  // Periphery Contracts - Bin Pools
  binQuoter: '0x82b5d24754AAB72AbF2D4025Cb58F8321c3d0305', // ✅ Deployed (Shanghai)
  binPositionManager: '0x0e4410CEE0BEf7C441B7b025d2de38aE05727d20', // ✅ Deployed (Shanghai)
  
  // Router
  infinityRouter: '0x0000000000000000000000000000000000000000', // Not deployed (use Universal Router)
  universalRouter: '0x9a554202Ff6E62e5533D394330D0A4B57efF7C7a', // ✅ Deployed (Shanghai) - NEW!
  mixedQuoter: '0x8349289AC7c186b79783Bf77D35A42B78b1Dd1dE', // ✅ Deployed (Shanghai)
  
  // Protocol Governance
  clProtocolFeeController: '0x0000000000000000000000000000000000000000', // To be deployed
  clPoolManagerOwner: '0x0000000000000000000000000000000000000000', // To be deployed
  
  // Standard Contracts
  permit2: '0x1d5E963f9581F5416Eae6C9978246B7dDf559Ff0', // ✅ Deployed (unchanged)
  wfuma: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // ✅ Wrapped FUMA (unchanged)
  
  // Custom Hooks
  fumaDiscountHook: '0x0000000000000000000000000000000000000000', // To be deployed
  launchpadHook: '0x0000000000000000000000000000000000000000', // To be deployed
} as const;

export const FUSHUMA_TESTNET_CONTRACTS = {
  // Testnet contract addresses (if testnet is available)
  vault: '0x0000000000000000000000000000000000000000',
  clPoolManager: '0x0000000000000000000000000000000000000000',
  binPoolManager: '0x0000000000000000000000000000000000000000',
  clQuoter: '0x0000000000000000000000000000000000000000',
  clPositionDescriptor: '0x0000000000000000000000000000000000000000',
  clPositionManager: '0x0000000000000000000000000000000000000000',
  binQuoter: '0x0000000000000000000000000000000000000000',
  binPositionManager: '0x0000000000000000000000000000000000000000',
  infinityRouter: '0x0000000000000000000000000000000000000000',
  mixedQuoter: '0x0000000000000000000000000000000000000000',
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  wfuma: '0x0000000000000000000000000000000000000000',
} as const;

/**
 * Get contract addresses for the current network
 */
export function getContracts(chainId: number) {
  switch (chainId) {
    case 121224: // Fushuma Mainnet
      return FUSHUMA_CONTRACTS;
    case 121225: // Fushuma Testnet (adjust based on actual testnet chain ID)
      return FUSHUMA_TESTNET_CONTRACTS;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

/**
 * Common token addresses on Fushuma Network
 */
export const COMMON_TOKENS = {
  FUMA: '0x0000000000000000000000000000000000000000', // Native FUMA token contract
  WFUMA: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // Wrapped FUMA
  USDC: '0x0000000000000000000000000000000000000000', // USDC on Fushuma
  USDT: '0x0000000000000000000000000000000000000000', // USDT on Fushuma
  WETH: '0x0000000000000000000000000000000000000000', // Wrapped ETH on Fushuma
  WBTC: '0x0000000000000000000000000000000000000000', // Wrapped BTC on Fushuma
} as const;

/**
 * Fee tiers for concentrated liquidity pools
 * Using FumaSwap SDK's FeeAmount enum
 */
export { FeeAmount } from '@pancakeswap/v3-sdk';

/**
 * Tick spacings for each fee tier
 * Note: These are from Uniswap V3, FumaSwap may use different values
 */
import { FeeAmount as SDKFeeAmount } from '@pancakeswap/v3-sdk';
export const TICK_SPACINGS: { [key: number]: number } = {
  [SDKFeeAmount.LOWEST]: 1,
  [SDKFeeAmount.LOW]: 10,
  [SDKFeeAmount.MEDIUM]: 60,
  [SDKFeeAmount.HIGH]: 200,
  3000: 60, // 0.3% fee tier (Uniswap V3 standard)
};

// Export individual contract addresses for easier imports
export const VAULT_ADDRESS = FUSHUMA_CONTRACTS.vault;
export const CL_POOL_MANAGER_ADDRESS = FUSHUMA_CONTRACTS.clPoolManager;
export const BIN_POOL_MANAGER_ADDRESS = FUSHUMA_CONTRACTS.binPoolManager;
export const CL_QUOTER_ADDRESS = FUSHUMA_CONTRACTS.clQuoter;
export const CL_POSITION_DESCRIPTOR_ADDRESS = FUSHUMA_CONTRACTS.clPositionDescriptor;
export const CL_POSITION_MANAGER_ADDRESS = FUSHUMA_CONTRACTS.clPositionManager;
export const BIN_QUOTER_ADDRESS = FUSHUMA_CONTRACTS.binQuoter;
export const BIN_POSITION_MANAGER_ADDRESS = FUSHUMA_CONTRACTS.binPositionManager;
export const INFINITY_ROUTER_ADDRESS = FUSHUMA_CONTRACTS.infinityRouter;
export const UNIVERSAL_ROUTER_ADDRESS = FUSHUMA_CONTRACTS.universalRouter;
export const MIXED_QUOTER_ADDRESS = FUSHUMA_CONTRACTS.mixedQuoter;
export const PERMIT2_ADDRESS = FUSHUMA_CONTRACTS.permit2;
export const WFUMA_ADDRESS = FUSHUMA_CONTRACTS.wfuma;
export const FUMA_DISCOUNT_HOOK_ADDRESS = FUSHUMA_CONTRACTS.fumaDiscountHook;
export const LAUNCHPAD_HOOK_ADDRESS = FUSHUMA_CONTRACTS.launchpadHook;
```

---

## 2. UniversalRouter Integration

### Swap Logic

**File:** `src/lib/fumaswap/swap.ts`

```typescript
/**
 * FumaSwap V4 Swap Utilities
 * 
 * Integration with deployed Universal Router
 */
import type { Token } from '@pancakeswap/sdk';
import type { Address } from 'viem';
import { encodePacked, parseUnits, formatUnits, encodeAbiParameters, parseAbiParameters } from 'viem';
import { UNIVERSAL_ROUTER_ADDRESS, CL_QUOTER_ADDRESS, FeeAmount } from './contracts';
import { getParametersForFee } from './poolKeyHelper';

export interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  route: string[];
  fee: number;
  minimumOutput: string;
}

export interface SwapParams {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  slippageTolerance: number; // in percentage (e.g., 0.5 for 0.5%)
  deadline: number; // in minutes
  recipient: Address;
}

// Universal Router command codes
const Commands = {
  V4_SWAP: '0x00',
  PERMIT2_TRANSFER_FROM: '0x0d',
  SWEEP: '0x04',
} as const;

/**
 * Get swap quote from the CLQuoter contract
 */
export async function getSwapQuote(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string
): Promise<SwapQuote | null> {
  try {
    const { publicClient } = await import('@/lib/viem');
    const CLQuoterABI = (await import('./abis/CLQuoter.json')).default;
    
    // Parse input amount
    const amountInWei = parseUnits(amountIn, tokenIn.decimals);
    
    // Determine swap direction (zeroForOne)
    const token0 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenIn : tokenOut;
    const token1 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenOut : tokenIn;
    const zeroForOne = tokenIn.address.toLowerCase() === token0.address.toLowerCase();
    
    // Prepare quote parameters with correct structure
    const fee = 3000; // 0.3% fee tier (TODO: make this dynamic based on pool)
    const quoteParams = {
      poolKey: {
        currency0: token0.address as Address,
        currency1: token1.address as Address,
        hooks: '0x0000000000000000000000000000000000000000' as Address,
        poolManager: (await import('./contracts')).CL_POOL_MANAGER_ADDRESS as Address,
        fee: fee,
        parameters: getParametersForFee(fee as FeeAmount), // Correctly encode tick spacing
      },
      zeroForOne,
      exactAmount: amountInWei,
      hookData: '0x' as `0x${string}`,
    };
    
    // Call CLQuoter
    const result = await publicClient.readContract({
      address: CL_QUOTER_ADDRESS as Address,
      abi: CLQuoterABI,
      functionName: 'quoteExactInputSingle',
      args: [quoteParams],
    }) as any;
    
    // Parse result
    const outputAmount = result[0]; // amountOut
    const outputAmountFormatted = formatUnits(outputAmount, tokenOut.decimals);
    
    return {
      inputAmount: amountIn,
      outputAmount: outputAmountFormatted,
      priceImpact: 0.1, // TODO: Calculate actual price impact
      route: [tokenIn.symbol!, tokenOut.symbol!],
      fee: 3000, // 0.3% fee in basis points
      minimumOutput: (parseFloat(outputAmountFormatted) * 0.995).toFixed(6), // 0.5% slippage
    };
  } catch (error: any) {
    console.error('Error getting swap quote from CLQuoter:', error);
    
    // Check if error is due to insufficient liquidity
    if (error?.message?.includes('UnexpectedRevertBytes') || 
        error?.message?.includes('0x486aa307')) {
      throw new Error('Pool has no liquidity yet. Please add liquidity first to enable swaps.');
    }
    
    // Fall back to null for other errors (don't use mock quotes in production)
    return null;
  }
}

/**
 * Execute a swap transaction using Universal Router
 */
export async function executeSwap(
  params: SwapParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  try {
    const { tokenIn, tokenOut, amountIn, slippageTolerance, deadline, recipient } = params;
    
    // Parse amounts
    const amountInWei = parseUnits(amountIn, tokenIn.decimals);
    
    // Get quote to calculate minimum output
    const quote = await getSwapQuote(tokenIn, tokenOut, amountIn);
    if (!quote) {
      throw new Error('Failed to get swap quote');
    }
    
    const minAmountOut = parseUnits(quote.minimumOutput, tokenOut.decimals);
    
    // Calculate deadline timestamp
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;
    
    // Encode commands for Universal Router
    // For a simple swap: V4_SWAP command
    const commands = encodePacked(['bytes1'], [Commands.V4_SWAP as `0x${string}`]);
    
    // Encode inputs for V4_SWAP
    // The Universal Router expects specific parameters for V4 swaps
    const swapInput = encodeAbiParameters(
      parseAbiParameters('address recipient, uint256 amountIn, uint256 amountOutMin, bytes path, bool payerIsUser'),
      [
        recipient,
        amountInWei,
        minAmountOut,
        encodePacked(['address', 'address'], [tokenIn.address as Address, tokenOut.address as Address]),
        true, // payer is user
      ]
    );
    
    const inputs = [swapInput];
    
    // Execute swap through Universal Router
    const result = await writeContract({
      address: UNIVERSAL_ROUTER_ADDRESS as Address,
      abi: (await import('./abis/UniversalRouter.json')).default,
      functionName: 'execute',
      args: [commands, inputs, deadlineTimestamp],
    });
    
    return result;
  } catch (error) {
    console.error('Error executing swap:', error);
    throw error;
  }
}

/**
 * Calculate minimum output with slippage tolerance
 */
export function calculateMinimumOutput(
  outputAmount: string,
  slippageTolerance: number
): string {
  const output = parseFloat(outputAmount);
  const minimum = output * (1 - slippageTolerance / 100);
  return minimum.toFixed(6);
}

/**
 * Validate swap parameters
 */
export function validateSwapParams(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string
): { valid: boolean; error?: string } {
  if (!tokenIn || !tokenOut) {
    return { valid: false, error: 'Please select both tokens' };
  }
  
  if (tokenIn.address === tokenOut.address) {
    return { valid: false, error: 'Cannot swap same token' };
  }
  
  if (!amountIn || parseFloat(amountIn) <= 0) {
    return { valid: false, error: 'Please enter an amount' };
  }
  
  return { valid: true };
}

/**
 * Mock quote for development
 */
function getMockQuote(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string
): SwapQuote {
  // Simple mock exchange rates for development
  const mockRates: Record<string, number> = {
    'WFUMA-USDC': 0.1,
    'WFUMA-USDT': 0.1,
    'USDC-USDT': 1.0,
    'USDT-USDC': 1.0,
    'WFUMA-WETH': 0.00003,
    'WETH-WFUMA': 33333,
    'WFUMA-WBTC': 0.000002,
    'WBTC-WFUMA': 500000,
  };

  const pairKey = `${tokenIn.symbol}-${tokenOut.symbol}`;
  const reversePairKey = `${tokenOut.symbol}-${tokenIn.symbol}`;
  
  let rate = mockRates[pairKey] || (1 / (mockRates[reversePairKey] || 1));
  
  const inputNum = parseFloat(amountIn);
  const outputNum = inputNum * rate * 0.997; // Apply 0.3% fee
  
  return {
    inputAmount: amountIn,
    outputAmount: outputNum.toFixed(6),
    priceImpact: 0.1, // Mock 0.1% price impact
    route: [tokenIn.symbol!, tokenOut.symbol!],
    fee: 3000, // 0.3% fee in basis points
    minimumOutput: (outputNum * 0.995).toFixed(6), // 0.5% slippage
  };
}

/**
 * Check if swap is possible between two tokens
 */
export function canSwap(tokenIn: Token, tokenOut: Token): boolean {
  if (!tokenIn || !tokenOut) return false;
  if (tokenIn.address === tokenOut.address) return false;
  return true;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price === 0) return '0';
  if (price < 0.000001) return price.toExponential(4);
  if (price < 1) return price.toFixed(6);
  if (price < 1000) return price.toFixed(4);
  return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Estimate gas for swap
 */
export async function estimateSwapGas(params: SwapParams): Promise<bigint> {
  // Mock gas estimate for development
  return BigInt(200000); // ~200k gas
}
```

### Swap UI Component

**File:** `src/components/defi/SwapWidget.tsx`

```typescript
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
    // Native tokens (ETH/FSM) don't need approval
    if (!amountIn || !tokenIn || tokenIn.address === '0x0000000000000000000000000000000000000000') {
      console.log('No approval needed: native token or no amount');
      setNeedsApproval(false);
      return;
    }
    
    if (!allowance) {
      // If allowance is not loaded yet, assume approval is needed
      console.log('Allowance not loaded, assuming approval needed');
      setNeedsApproval(true);
      return;
    }
    
    try {
      const amountInWei = parseUnits(amountIn, tokenIn.decimals);
      const currentAllowance = BigInt(allowance.toString());
      const needsApprove = currentAllowance < amountInWei;
      console.log('Approval check:', {
        token: tokenIn.symbol,
        amount: amountIn,
        amountInWei: amountInWei.toString(),
        currentAllowance: currentAllowance.toString(),
        needsApproval: needsApprove
      });
      setNeedsApproval(needsApprove);
    } catch (error) {
      console.error('Error checking approval:', error);
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
        } else {
          setAmountOut('');
          setQuote(null);
        }
      } catch (error: any) {
        console.error('Error fetching quote:', error);
        if (error?.message?.includes('no liquidity')) {
          toast.error(error.message);
        } else {
          toast.error('Failed to fetch quote. Pool may not have liquidity yet.');
        }
        setAmountOut('');
        setQuote(null);
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
```

---

## 3. CLQuoter Integration

The CLQuoter integration is included in the swap.ts file above (see `getSwapQuote()` function).

**Key Function:** `getSwapQuote()`

This function:
1. Prepares quote parameters with pool key structure
2. Calls `CLQuoter.quoteExactInputSingle()` using Viem's `readContract`
3. Returns formatted quote with output amount and price impact

---

## 4. CLPositionManager Integration

### Liquidity Management Logic

**File:** `src/lib/fumaswap/liquidity.ts`

```typescript
/**
 * FumaSwap V4 Liquidity Operations
 * 
 * Functions for adding and removing liquidity using CLPositionManager
 * Following PancakeSwap V4 (Infinity) implementation pattern
 */

import type { Token } from '@pancakeswap/sdk';
import type { Address } from 'viem';
import { parseUnits, encodeFunctionData, zeroAddress, keccak256, encodePacked } from 'viem';
import { FeeAmount, TICK_SPACINGS, CL_POSITION_MANAGER_ADDRESS, CL_POOL_MANAGER_ADDRESS } from './contracts';
import { isPlaceholderAddress } from './tokens';
import { getNearestUsableTick, priceToTick } from './pools';
import { ActionsPlanner } from './utils/ActionsPlanner';
import { ACTIONS } from './utils/constants';
import { encodeCLPoolParameters } from './utils/encodePoolParameters';
import { maxLiquidityForAmounts, getSqrtRatioAtTick } from './utils/liquidityMath';
import type { PoolKey } from './types';

export interface AddLiquidityParams {
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  tickLower: number;
  tickUpper: number;
  recipient: Address;
  deadline: number;
}

export interface RemoveLiquidityParams {
  tokenId: string;
  liquidity: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline: number;
}

export interface IncreaseLiquidityParams {
  tokenId: string;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline: number;
}

export interface CollectFeesParams {
  tokenId: string;
  recipient: Address;
  amount0Max: bigint;
  amount1Max: bigint;
}

/**
 * Calculate pool ID from pool key
 */
function getPoolId(poolKey: PoolKey): `0x${string}` {
  const encodedParams = encodeCLPoolParameters(poolKey.parameters);
  return keccak256(
    encodePacked(
      ['address', 'address', 'address', 'address', 'uint24', 'bytes32'],
      [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.hooks,
        poolKey.poolManager,
        poolKey.fee,
        encodedParams,
      ]
    )
  );
}

/**
 * Add liquidity to a pool (mint new position)
 * Uses PancakeSwap V4 ActionsPlanner pattern
 */
export async function addLiquidity(
  params: AddLiquidityParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  // Check if contracts are deployed
  if (isPlaceholderAddress(CL_POSITION_MANAGER_ADDRESS)) {
    throw new Error('Position Manager contract not deployed yet. Liquidity functionality will be available after contract deployment.');
  }

  try {
    const {
      token0,
      token1,
      fee,
      amount0Desired,
      amount1Desired,
      amount0Min,
      amount1Min,
      tickLower,
      tickUpper,
      recipient,
      deadline,
    } = params;

    console.log('🔢 Calculating liquidity...');
    console.log('  Token0 decimals:', token0.decimals);
    console.log('  Token1 decimals:', token1.decimals);
    console.log('  Amount0Desired:', amount0Desired.toString());
    console.log('  Amount1Desired:', amount1Desired.toString());
    console.log('  TickLower:', tickLower);
    console.log('  TickUpper:', tickUpper);

    // Get tick spacing for the fee tier
    const tickSpacing = TICK_SPACINGS[fee];
    if (!tickSpacing) {
      throw new Error(`Invalid fee tier: ${fee}`);
    }

    // Prepare pool key with OBJECT parameters (will be encoded later)
    const poolKey: PoolKey = {
      currency0: token0.address as Address,
      currency1: token1.address as Address,
      hooks: zeroAddress as Address,
      poolManager: CL_POOL_MANAGER_ADDRESS as Address,
      fee,
      parameters: { tickSpacing }, // Keep as object, encode later
    };

    // Get pool ID and fetch current sqrt price
    const poolId = getPoolId(poolKey);
    console.log('📊 Pool ID:', poolId);

    // Import viem client
    const { createPublicClient, http } = await import('viem');
    const { fushuma } = await import('./chains');
    
    const publicClient = createPublicClient({
      chain: fushuma,
      transport: http(),
    });

    // Load PoolManager ABI and fetch slot0
    const CLPoolManagerABI = (await import('./abis/CLPoolManager.json')).default;
    
    console.log('📞 Fetching pool slot0...');
    const slot0 = await publicClient.readContract({
      address: CL_POOL_MANAGER_ADDRESS as Address,
      abi: CLPoolManagerABI,
      functionName: 'getSlot0',
      args: [poolId],
    }) as [bigint, number, number, number];

    const sqrtPriceX96 = slot0[0];
    const currentTick = slot0[1];
    console.log('✅ Pool state fetched:');
    console.log('  sqrtPriceX96:', sqrtPriceX96.toString());
    console.log('  currentTick:', currentTick);

    // Calculate sqrt ratios at tick boundaries
    const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
    const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);
    console.log('  sqrtRatioAX96 (lower):', sqrtRatioAX96.toString());
    console.log('  sqrtRatioBX96 (upper):', sqrtRatioBX96.toString());

    // Calculate liquidity using the proper formula
    const liquidity = maxLiquidityForAmounts(
      sqrtPriceX96,
      sqrtRatioAX96,
      sqrtRatioBX96,
      amount0Desired,
      amount1Desired
    );

    console.log('✅ Calculated liquidity:', liquidity.toString());

    if (liquidity === 0n) {
      throw new Error('Calculated liquidity is zero. Please check your amounts and price range.');
    }

    // Prepare position config
    const positionConfig = {
      poolKey,
      tickLower,
      tickUpper,
    };

    // Encode the position config (convert parameters object to Bytes32)
    const encodedPositionConfig = {
      ...positionConfig,
      poolKey: {
        ...positionConfig.poolKey,
        parameters: encodeCLPoolParameters(positionConfig.poolKey.parameters),
      },
    };

    // Create ActionsPlanner
    const planner = new ActionsPlanner();

    // Add CL_MINT_POSITION action with CALCULATED liquidity
    console.log('📝 Adding CL_MINT_POSITION action with liquidity:', liquidity.toString());
    planner.add(ACTIONS.CL_MINT_POSITION, [
      encodedPositionConfig, // EncodedCLPositionConfig struct
      liquidity, // CALCULATED liquidity (not 0!)
      amount0Desired, // amount0Max
      amount1Desired, // amount1Max
      recipient, // owner
      '0x' as `0x${string}`, // hookData
    ]);

    // Finalize with CLOSE_CURRENCY actions (use DECODED poolKey for currency addresses)
    const calls = planner.finalizeModifyLiquidityWithClose(poolKey);

    // Calculate deadline timestamp
    const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + deadline * 60);

    // Load ABI
    const CLPositionManagerABI = (await import('./abis/CLPositionManager.json')).default;

    // Call modifyLiquidities
    const result = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'modifyLiquidities',
      args: [calls, deadlineTimestamp],
    });

    return result;
  } catch (error) {
    console.error('Error adding liquidity:', error);
    throw error;
  }
}

/**
 * Remove liquidity from a position (burn)
 */
export async function removeLiquidity(
  params: RemoveLiquidityParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  // Check if contracts are deployed
  if (isPlaceholderAddress(CL_POSITION_MANAGER_ADDRESS)) {
    throw new Error('Position Manager contract not deployed yet.');
  }

  try {
    const { tokenId, liquidity, amount0Min, amount1Min, deadline } = params;

    // Calculate deadline timestamp
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;

    // Prepare burn parameters
    const burnParams = {
      tokenId: BigInt(tokenId),
      liquidity,
      amount0Min,
      amount1Min,
      hookData: '0x' as `0x${string}`,
    };

    // Call CLPositionManager burn function
    const CLPositionManagerABI = (await import('./abis/CLPositionManager.json')).default;
    
    const result = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'burn',
      args: [burnParams, deadlineTimestamp],
    });

    return result;
  } catch (error) {
    console.error('Error removing liquidity:', error);
    throw error;
  }
}

/**
 * Increase liquidity in an existing position
 */
export async function increaseLiquidity(
  params: IncreaseLiquidityParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  // Check if contracts are deployed
  if (isPlaceholderAddress(CL_POSITION_MANAGER_ADDRESS)) {
    throw new Error('Position Manager contract not deployed yet.');
  }

  try {
    const { tokenId, amount0Desired, amount1Desired, amount0Min, amount1Min, deadline } = params;

    // Calculate deadline timestamp
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;

    // Prepare increase liquidity parameters
    const increaseParams = {
      tokenId: BigInt(tokenId),
      liquidity: 0n, // Will be calculated by the contract
      amount0Max: amount0Desired,
      amount1Max: amount1Desired,
      amount0Min,
      amount1Min,
      hookData: '0x' as `0x${string}`,
    };

    // Call CLPositionManager increaseLiquidity function
    const CLPositionManagerABI = (await import('./abis/CLPositionManager.json')).default;
    
    const result = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'increaseLiquidity',
      args: [increaseParams, deadlineTimestamp],
    });

    return result;
  } catch (error) {
    console.error('Error increasing liquidity:', error);
    throw error;
  }
}

/**
 * Collect fees from a position
 */
export async function collectFees(
  params: CollectFeesParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  // Check if contracts are deployed
  if (isPlaceholderAddress(CL_POSITION_MANAGER_ADDRESS)) {
    throw new Error('Position Manager contract not deployed yet.');
  }

  try {
    const { tokenId, recipient, amount0Max, amount1Max } = params;

    // Prepare collect parameters
    const collectParams = {
      tokenId: BigInt(tokenId),
      recipient,
      amount0Max,
      amount1Max,
      hookData: '0x' as `0x${string}`,
    };

    // Call CLPositionManager collect function
    const CLPositionManagerABI = (await import('./abis/CLPositionManager.json')).default;
    
    const result = await writeContract({
      address: CL_POSITION_MANAGER_ADDRESS as Address,
      abi: CLPositionManagerABI,
      functionName: 'collect',
      args: [collectParams],
    });

    return result;
  } catch (error) {
    console.error('Error collecting fees:', error);
    throw error;
  }
}

/**
 * Calculate price impact for liquidity operations
 */
export function calculateLiquidityPriceImpact(
  amount0: bigint,
  amount1: bigint,
  poolReserve0: bigint,
  poolReserve1: bigint
): number {
  try {
    if (poolReserve0 === 0n || poolReserve1 === 0n) {
      return 0;
    }

    const ratio0 = Number(amount0) / Number(poolReserve0);
    const ratio1 = Number(amount1) / Number(poolReserve1);
    
    return Math.max(ratio0, ratio1) * 100;
  } catch (error) {
    return 0;
  }
}

/**
 * Validate liquidity parameters
 */
export function validateLiquidityParams(
  token0: Token,
  token1: Token,
  amount0: string,
  amount1: string
): { valid: boolean; error?: string } {
  if (!token0 || !token1) {
    return { valid: false, error: 'Please select both tokens' };
  }
  
  if (token0.address === token1.address) {
    return { valid: false, error: 'Cannot provide liquidity for same token' };
  }
  
  if (!amount0 || parseFloat(amount0) <= 0) {
    return { valid: false, error: 'Please enter amount for first token' };
  }
  
  if (!amount1 || parseFloat(amount1) <= 0) {
    return { valid: false, error: 'Please enter amount for second token' };
  }
  
  return { valid: true };
}

/**
 * Calculate tick range for full range liquidity
 */
export function getFullRangeTickRange(fee: FeeAmount): { tickLower: number; tickUpper: number } {
  const tickSpacing = TICK_SPACINGS[fee];
  const minTick = Math.ceil(-887272 / tickSpacing) * tickSpacing;
  const maxTick = Math.floor(887272 / tickSpacing) * tickSpacing;
  
  return {
    tickLower: minTick,
    tickUpper: maxTick,
  };
}
```

### Add Liquidity UI Component

**File:** `src/components/defi/AddLiquidity.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
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
import { LIQUIDITY_TOKEN_LIST } from '@/lib/fumaswap/tokens';
import { FeeAmount, TICK_SPACINGS } from '@/lib/fumaswap/contracts';
import { formatFee, getFeeTierName } from '@/lib/fumaswap/pools';
import { useTokenBalance } from '@/lib/fumaswap/hooks/useTokenBalance';
import { formatTokenAmount } from '@/lib/fumaswap/utils/tokens';
import { useBalance, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Token } from '@pancakeswap/sdk';
import { parseUnits, erc20Abi } from 'viem';
import { CL_POSITION_MANAGER_ADDRESS } from '@/lib/fumaswap/contracts';

export function AddLiquidity() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
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
    
    if (isWFUMA_USDT || isWFUMA_USDC) {
      setPoolExists(true);
      setFeeTier(500); // 0.05% for initialized pools (fixed November 18, 2025)
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
        // For custom range, use simple tick calculation
        // TODO: Implement proper price-to-tick conversion
        const tickSpacing = TICK_SPACINGS[feeTier];
        tickLower = -887200; // Near minimum tick
        tickUpper = 887200;  // Near maximum tick
        console.log('✅ Custom range ticks:', { tickLower, tickUpper, tickSpacing });
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

```

---

## 5. CLPoolManager Integration

### Pool Data Fetching

**File:** `src/lib/fumaswap/pools.ts`

```typescript
/**
 * FumaSwap V4 Pool Utilities
 * 
 * Integration layer for pool and liquidity operations
 * Now with actual on-chain queries
 */

import { FeeAmount, TICK_SPACINGS, CL_POOL_MANAGER_ADDRESS } from './contracts';
export { FeeAmount };
import { isPlaceholderAddress } from './tokens';
import type { Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import { getParametersForFee } from './poolKeyHelper';
import { STATIC_POOLS } from './staticPools';

// Define Fushuma chain
const fushuma = defineChain({
  id: 121224,
  name: 'Fushuma',
  network: 'fushuma',
  nativeCurrency: {
    decimals: 18,
    name: 'FUMA',
    symbol: 'FUMA',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.fushuma.com'],
    },
    public: {
      http: ['https://rpc.fushuma.com'],
    },
  },
});

// CLPoolManager ABI (minimal for reading pool data)
const CLPoolManagerABI = [
  {
    type: 'function',
    name: 'getSlot0',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLiquidity',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{ name: 'liquidity', type: 'uint128' }],
    stateMutability: 'view',
  },
] as const;

export interface Pool {
  id: string;
  token0: Address;
  token1: Address;
  token0Symbol: string;
  token1Symbol: string;
  fee: FeeAmount | number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  tvl: string;
  volume24h: string;
  apr: number;
}

export interface Position {
  tokenId: string;
  owner: Address;
  token0: Address;
  token1: Address;
  token0Symbol: string;
  token1Symbol: string;
  fee: FeeAmount;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  tokensOwed0: string;
  tokensOwed1: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
}

export interface PositionValue {
  amount0: string;
  amount1: string;
  fees0: string;
  fees1: string;
  totalValue: string;
}

/**
 * Calculate pool ID from pool key
 * This is how PancakeSwap V4 generates deterministic pool IDs
 */
function getPoolId(poolKey: {
  currency0: Address;
  currency1: Address;
  hooks: Address;
  poolManager: Address;
  fee: number;
  parameters: `0x${string}`;
}): `0x${string}` {
  // Pool ID is keccak256 of abi.encode(poolKey)
  const { keccak256, encodeAbiParameters, parseAbiParameters } = require('viem');
  
  const encoded = encodeAbiParameters(
    parseAbiParameters('address, address, address, address, uint24, bytes32'),
    [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.hooks,
      poolKey.poolManager,
      poolKey.fee,
      poolKey.parameters,
    ]
  );
  
  return keccak256(encoded);
}

/**
 * Get pool data from the blockchain
 */
export async function getPool(
  token0: Address,
  token1: Address,
  fee: FeeAmount
): Promise<Pool | null> {
  try {
    const publicClient = createPublicClient({
      chain: fushuma,
      transport: http(),
    });

    // Sort tokens (required by Uniswap V3/V4)
    const [currency0, currency1] = token0.toLowerCase() < token1.toLowerCase()
      ? [token0, token1]
      : [token1, token0];

    // Build pool key with correct parameters
    const poolKey = {
      currency0,
      currency1,
      hooks: '0x0000000000000000000000000000000000000000' as Address,
      poolManager: CL_POOL_MANAGER_ADDRESS as Address,
      fee,
      parameters: getParametersForFee(fee),
    };

    // Calculate pool ID
    const poolId = getPoolId(poolKey);

    // Query pool slot0
    const slot0 = await publicClient.readContract({
      address: CL_POOL_MANAGER_ADDRESS as Address,
      abi: CLPoolManagerABI,
      functionName: 'getSlot0',
      args: [poolId],
    });

    const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0;

    // If sqrtPriceX96 is 0, pool doesn't exist
    if (sqrtPriceX96 === 0n) {
      return null;
    }

    // Query pool liquidity
    const liquidity = await publicClient.readContract({
      address: CL_POOL_MANAGER_ADDRESS as Address,
      abi: CLPoolManagerABI,
      functionName: 'getLiquidity',
      args: [poolId],
    });

    // Get token symbols (simplified - you may want to query from token contracts)
    const token0Symbol = currency0 === '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' ? 'WFUMA' :
                         currency0 === '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e' ? 'USDT' :
                         currency0 === '0xf8EA5627691E041dae171350E8Df13c592084848' ? 'USDC' : 'UNKNOWN';
    
    const token1Symbol = currency1 === '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' ? 'WFUMA' :
                         currency1 === '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e' ? 'USDT' :
                         currency1 === '0xf8EA5627691E041dae171350E8Df13c592084848' ? 'USDC' : 'UNKNOWN';

    return {
      id: poolId,
      token0: currency0,
      token1: currency1,
      token0Symbol,
      token1Symbol,
      fee,
      liquidity: liquidity.toString(),
      sqrtPriceX96: sqrtPriceX96.toString(),
      tick: Number(tick),
      tvl: '0', // TODO: Calculate from liquidity and price
      volume24h: '0', // TODO: Query from events or subgraph
      apr: 0, // TODO: Calculate from volume and fees
    };
  } catch (error) {
    console.error('Error fetching pool:', error);
    return null;
  }
}

/**
 * Get all known pools
 * 
 * For now, we'll hardcode the known pools and query their data
 * In the future, this should query a subgraph or index events
 */
export async function getAllPools(): Promise<Pool[]> {
  try {
    // For now, return static pools since RPC connection may be slow/unreliable
    // TODO: Re-enable dynamic fetching when RPC is stable
    console.log('Returning static pools (RPC fetching disabled temporarily)');
    return STATIC_POOLS;
    
    /* Dynamic fetching - re-enable when RPC is stable
    const knownPools = [
      {
        token0: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e' as Address, // USDT
        token1: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' as Address, // WFUMA
        fee: 3000 as FeeAmount,
      },
      {
        token0: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E' as Address, // WFUMA
        token1: '0xf8EA5627691E041dae171350E8Df13c592084848' as Address, // USDC
        fee: 3000 as FeeAmount,
      },
    ];

    const pools: Pool[] = [];

    for (const { token0, token1, fee } of knownPools) {
      const pool = await getPool(token0, token1, fee);
      if (pool) {
        pools.push(pool);
      }
    }

    return pools;
    */
  } catch (error) {
    console.error('Error fetching pools:', error);
    return STATIC_POOLS; // Fallback to static pools
  }
}

/**
 * Get user's liquidity positions
 * 
 * TODO: Implement after CLPositionManager is integrated
 */
export async function getUserPositions(address: Address): Promise<Position[]> {
  try {
    // TODO: Call CLPositionManager.balanceOf() and positions()
    return [];
  } catch (error) {
    console.error('Error fetching user positions:', error);
    return [];
  }
}

/**
 * Calculate position value in tokens
 * 
 * TODO: Implement proper calculation
 */
export function calculatePositionValue(position: Position): PositionValue {
  return {
    amount0: '0',
    amount1: '0',
    fees0: '0',
    fees1: '0',
    totalValue: '0',
  };
}

/**
 * Get nearest usable tick for a price
 */
export function getNearestUsableTick(tick: number, tickSpacing: number): number {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  
  const MIN_TICK = -887272;
  const MAX_TICK = 887272;
  
  if (rounded < MIN_TICK) return MIN_TICK;
  if (rounded > MAX_TICK) return MAX_TICK;
  
  return rounded;
}

/**
 * Calculate tick from price
 */
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/**
 * Calculate price from tick
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

/**
 * Calculate TVL for a pool
 * 
 * TODO: Implement after price oracle is available
 */
export function calculatePoolTVL(pool: Pool): string {
  return pool.tvl || '0';
}

/**
 * Calculate APR for a pool based on volume and fees
 */
export function calculatePoolAPR(pool: Pool, volume24h: string): number {
  try {
    const tvl = parseFloat(pool.tvl);
    const volume = parseFloat(volume24h);
    
    if (tvl === 0) return 0;
    
    const feePercentage = pool.fee / 1000000;
    const dailyFees = volume * feePercentage;
    const annualFees = dailyFees * 365;
    const apr = (annualFees / tvl) * 100;
    
    return apr;
  } catch (error) {
    return 0;
  }
}

/**
 * Format fee amount as percentage
 */
export function formatFee(fee: FeeAmount | number): string {
  return `${(fee / 10000).toFixed(2)}%`;
}

/**
 * Get fee tier name
 */
export function getFeeTierName(fee: FeeAmount): string {
  switch (fee) {
    case FeeAmount.LOWEST:
      return '0.01% - Best for stablecoins';
    case FeeAmount.LOW:
      return '0.05% - Best for stable pairs';
    case FeeAmount.MEDIUM:
      return '0.25% - Best for most pairs';
    case FeeAmount.HIGH:
      return '1% - Best for exotic pairs';
    default:
      return 'Unknown';
  }
}

/**
 * Check if pool exists
 */
export async function poolExists(
  token0: Address,
  token1: Address,
  fee: FeeAmount
): Promise<boolean> {
  const pool = await getPool(token0, token1, fee);
  return pool !== null;
}

/**
 * Get pool address (deterministic)
 * 
 * For V4, pools don't have individual addresses - they're managed by CLPoolManager
 * Pool ID is used instead
 */
export function getPoolAddress(
  token0: Address,
  token1: Address,
  fee: FeeAmount
): Address {
  // V4 pools are managed by CLPoolManager, not individual contracts
  return CL_POOL_MANAGER_ADDRESS as Address;
}

/**
 * Estimate liquidity from token amounts
 * 
 * TODO: Implement proper liquidity calculation
 */
export function estimateLiquidity(
  amount0: bigint,
  amount1: bigint,
  tickLower: number,
  tickUpper: number,
  currentTick: number
): bigint {
  return BigInt(0);
}

/**
 * Calculate token amounts from liquidity
 * 
 * TODO: Implement proper amount calculation
 */
export function calculateTokenAmounts(
  liquidity: bigint,
  tickLower: number,
  tickUpper: number,
  currentTick: number
): { amount0: bigint; amount1: bigint } {
  return {
    amount0: BigInt(0),
    amount1: BigInt(0),
  };
}
```

### Pool Browser UI Component

**File:** `src/components/defi/PoolBrowser.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp, Droplet, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatFee, getAllPools, type Pool } from '@/lib/fumaswap/pools';

export function PoolBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'tvl' | 'volume' | 'apr'>('tvl');
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch pools on mount
  useEffect(() => {
    async function fetchPools() {
      try {
        setLoading(true);
        const fetchedPools = await getAllPools();
        console.log('Fetched pools:', fetchedPools);
        setPools(fetchedPools);
      } catch (error) {
        console.error('Error fetching pools:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPools();
  }, []);
  
  const filteredPools = pools.filter((pool) => {
    const query = searchQuery.toLowerCase();
    return (
      pool.token0Symbol.toLowerCase().includes(query) ||
      pool.token1Symbol.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'tvl':
        return parseFloat(b.tvl) - parseFloat(a.tvl);
      case 'volume':
        return parseFloat(b.volume24h) - parseFloat(a.volume24h);
      case 'apr':
        return b.apr - a.apr;
      default:
        return 0;
    }
  });
  
  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (numValue >= 1000000) {
      return `$${(numValue / 1000000).toFixed(2)}M`;
    }
    if (numValue >= 1000) {
      return `$${(numValue / 1000).toFixed(2)}K`;
    }
    return `$${numValue.toFixed(2)}`;
  };
  
  const totalTVL = pools.reduce((sum, pool) => sum + parseFloat(pool.tvl || '0'), 0);
  const totalVolume = pools.reduce((sum, pool) => sum + parseFloat(pool.volume24h || '0'), 0);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Liquidity Pools</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => setSortBy('tvl')}
                >
                  <div className="flex items-center gap-1">
                    TVL
                    {sortBy === 'tvl' && <TrendingUp className="h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => setSortBy('volume')}
                >
                  <div className="flex items-center gap-1">
                    Volume (24h)
                    {sortBy === 'volume' && <TrendingUp className="h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => setSortBy('apr')}
                >
                  <div className="flex items-center gap-1">
                    APR
                    {sortBy === 'apr' && <TrendingUp className="h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading pools...
                  </TableCell>
                </TableRow>
              ) : filteredPools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No pools found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPools.map((pool) => (
                  <TableRow key={pool.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold">
                            {pool.token0Symbol[0]}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-secondary/20 border-2 border-background flex items-center justify-center text-xs font-bold">
                            {pool.token1Symbol[0]}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">
                            {pool.token0Symbol}/{pool.token1Symbol}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Liquidity: {pool.liquidity}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatFee(pool.fee)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Droplet className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{formatCurrency(pool.tvl)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(pool.volume24h)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {pool.apr.toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href="/defi/fumaswap/liquidity">
                          <Button variant="outline" size="sm">
                            Add Liquidity
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(`https://fumascan.com/address/${pool.token0}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total TVL</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(totalTVL)}
                  </p>
                </div>
                <Droplet className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">24h Volume</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(totalVolume)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Pools</p>
                  <p className="text-2xl font-bold mt-1">{pools.length}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold">{pools.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 6. Vault Integration

The Vault has no direct frontend integration. It is called internally by other contracts (UniversalRouter, CLPositionManager, CLPoolManager).

**Contract Functions:**
- `lock(address token, uint256 amount)` - Called when tokens need to be deposited
- `unlock(address token, uint256 amount)` - Called when tokens need to be withdrawn

These are handled automatically by the smart contracts during swaps and liquidity operations.

---

## 7. Utility Functions

### ActionsPlanner

**File:** `src/lib/fumaswap/utils/ActionsPlanner.ts`

```typescript
import {
  AbiParameter,
  Address,
  concat,
  encodeAbiParameters,
  Hex,
  parseAbiParameters,
  toHex,
  zeroAddress,
} from 'viem';
import { ACTIONS, ACTION_CONSTANTS } from './constants';
import type { PoolKey, EncodedPoolKey } from '../types';

type Plan = {
  action: number;
  param: any[];
};

// ABI struct definitions matching PancakeSwap V4
const ABI_STRUCT_POOL_KEY = [
  'struct PoolKey { address currency0; address currency1; address hooks; address poolManager; uint24 fee; bytes32 parameters; }'
];

const ABI_STRUCT_POSITION_CONFIG = [
  'struct PositionConfig { PoolKey poolKey; int24 tickLower; int24 tickUpper; }',
  ...ABI_STRUCT_POOL_KEY
];

// ABI definitions for each action type
const ACTIONS_ABI: Record<number, readonly AbiParameter[]> = {
  [ACTIONS.CL_MINT_POSITION]: parseAbiParameters([
    'PositionConfig positionConfig, uint128 liquidity, uint128 amount0Max, uint128 amount1Max, address owner, bytes hookData',
    ...ABI_STRUCT_POSITION_CONFIG,
  ]),
  [ACTIONS.CL_INCREASE_LIQUIDITY]: parseAbiParameters([
    'uint256 tokenId, uint128 liquidity, uint128 amount0Max, uint128 amount1Max, bytes hookData',
    ...ABI_STRUCT_POSITION_CONFIG,
  ]),
  [ACTIONS.SETTLE_PAIR]: parseAbiParameters('address currency0, address currency1'),
  [ACTIONS.SWEEP]: parseAbiParameters('address currency, address to'),
  [ACTIONS.TAKE]: parseAbiParameters('address currency, address recipient, uint256 amount'),
  [ACTIONS.CLOSE_CURRENCY]: parseAbiParameters('address currency'),
};

export class ActionsPlanner {
  private plans: Plan[] = [];

  public add(action: number, param: any[]) {
    this.plans.push({ action, param });
  }

  public encode(): Hex {
    const encodeAbi = parseAbiParameters('bytes, bytes[]');
    const actions = concat(
      this.plans.map((plan) =>
        toHex(plan.action, {
          size: 1,
        })
      )
    );

    const params = this.plans.map((plan) => {
      const abi = ACTIONS_ABI[plan.action];
      if (!abi) {
        throw new Error(`No ABI defined for action ${plan.action}`);
      }
      return encodeAbiParameters(abi, plan.param as any);
    });

    return encodeAbiParameters(encodeAbi, [actions, params]);
  }

  /**
   * Close currency pair by settling debts. This is the recommended method for minting new positions.
   * CLOSE_CURRENCY will automatically handle token transfers by either taking or settling.
   */
  public finalizeModifyLiquidityWithClose(poolKey: PoolKey | EncodedPoolKey) {
    this.add(ACTIONS.CLOSE_CURRENCY, [poolKey.currency0]);
    this.add(ACTIONS.CLOSE_CURRENCY, [poolKey.currency1]);
    return this.encode();
  }

  /**
   * Pay and settle currency pair. User's token0 and token1 will be transferred from user and paid.
   * This is commonly used for increase liquidity or mint action.
   */
  public finalizeModifyLiquidityWithSettlePair(poolKey: PoolKey | EncodedPoolKey, sweepRecipient: Address) {
    this.add(ACTIONS.SETTLE_PAIR, [poolKey.currency0, poolKey.currency1]);
    if (poolKey.currency0 === zeroAddress) {
      this.add(ACTIONS.SWEEP, [poolKey.currency0, sweepRecipient]);
    }

    return this.encode();
  }
}
```

### Pool Parameter Encoding

**File:** `src/lib/fumaswap/utils/encodePoolParameters.ts`

```typescript
import { concat, encodePacked, pad, Hex } from 'viem';

export interface CLPoolParameter {
  tickSpacing: number;
  hooksRegistration?: HooksRegistration;
}

export interface HooksRegistration {
  beforeInitialize?: boolean;
  afterInitialize?: boolean;
  beforeAddLiquidity?: boolean;
  afterAddLiquidity?: boolean;
  beforeRemoveLiquidity?: boolean;
  afterRemoveLiquidity?: boolean;
  beforeSwap?: boolean;
  afterSwap?: boolean;
  beforeDonate?: boolean;
  afterDonate?: boolean;
}

const HOOKS_REGISTRATION_OFFSET: Record<keyof HooksRegistration, number> = {
  beforeInitialize: 0,
  afterInitialize: 1,
  beforeAddLiquidity: 2,
  afterAddLiquidity: 3,
  beforeRemoveLiquidity: 4,
  afterRemoveLiquidity: 5,
  beforeSwap: 6,
  afterSwap: 7,
  beforeDonate: 8,
  afterDonate: 9,
};

export const encodeHooksRegistration = (hooksRegistration?: HooksRegistration): Hex => {
  let registration = 0x0000;

  if (hooksRegistration) {
    for (const key in hooksRegistration) {
      if (hooksRegistration[key as keyof HooksRegistration]) {
        // eslint-disable-next-line no-bitwise
        registration |= 1 << HOOKS_REGISTRATION_OFFSET[key as keyof HooksRegistration];
      }
    }
  }

  return `0x${registration.toString(16).padStart(4, '0')}`;
};

export const encodeCLPoolParameters = (params: CLPoolParameter): Hex => {
  const hooks = encodeHooksRegistration(params?.hooksRegistration);
  const tickSpacing = encodePacked(['int24'], [params.tickSpacing]);

  return pad(concat([tickSpacing, hooks]));
};
```

### Liquidity Math

**File:** `src/lib/fumaswap/utils/liquidityMath.ts`

```typescript
/**
 * Liquidity calculation utilities
 * Based on PancakeSwap V3 SDK implementation
 */

const Q96 = 2n ** 96n;

/**
 * Returns a precise maximum amount of liquidity received for a given amount of token 0
 * @param sqrtRatioAX96 The price at the lower boundary
 * @param sqrtRatioBX96 The price at the upper boundary
 * @param amount0 The token0 amount
 * @returns liquidity for amount0, precise
 */
export function maxLiquidityForAmount0Precise(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount0: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  const numerator = amount0 * sqrtRatioAX96 * sqrtRatioBX96;
  const denominator = Q96 * (sqrtRatioBX96 - sqrtRatioAX96);

  return numerator / denominator;
}

/**
 * Computes the maximum amount of liquidity received for a given amount of token1
 * @param sqrtRatioAX96 The price at the lower tick boundary
 * @param sqrtRatioBX96 The price at the upper tick boundary
 * @param amount1 The token1 amount
 * @returns liquidity for amount1
 */
export function maxLiquidityForAmount1(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount1: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }
  return (amount1 * Q96) / (sqrtRatioBX96 - sqrtRatioAX96);
}

/**
 * Computes the maximum amount of liquidity received for a given amount of token0, token1,
 * and the prices at the tick boundaries.
 * @param sqrtRatioCurrentX96 the current price
 * @param sqrtRatioAX96 price at lower boundary
 * @param sqrtRatioBX96 price at upper boundary
 * @param amount0 token0 amount
 * @param amount1 token1 amount
 * @returns maximum liquidity
 */
export function maxLiquidityForAmounts(
  sqrtRatioCurrentX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount0: bigint,
  amount1: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  if (sqrtRatioCurrentX96 <= sqrtRatioAX96) {
    return maxLiquidityForAmount0Precise(sqrtRatioAX96, sqrtRatioBX96, amount0);
  }
  if (sqrtRatioCurrentX96 < sqrtRatioBX96) {
    const liquidity0 = maxLiquidityForAmount0Precise(sqrtRatioCurrentX96, sqrtRatioBX96, amount0);
    const liquidity1 = maxLiquidityForAmount1(sqrtRatioAX96, sqrtRatioCurrentX96, amount1);
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  }
  return maxLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1);
}

/**
 * Computes sqrt price from tick
 * @param tick The tick for which to compute the sqrt price
 */
export function getSqrtRatioAtTick(tick: number): bigint {
  const absTick = tick < 0 ? -tick : tick;
  
  let ratio = (absTick & 0x1) !== 0
    ? 0xfffcb933bd6fad37aa2d162d1a594001n
    : 0x100000000000000000000000000000000n;
    
  if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) ratio = (2n ** 256n - 1n) / ratio;

  // Back to Q96
  return ratio >> 32n;
}
```

### Token Utilities

**File:** `src/lib/fumaswap/tokens.ts`

```typescript
import { Token } from '@pancakeswap/sdk';
import { PAYMENT_TOKENS } from '../launchpad/contracts';

/**
 * Token definitions for Fushuma Network
 * 
 * Note: WFUMA, WETH, WBTC addresses are placeholders until contracts are deployed
 * USDC and USDT use actual deployed addresses from launchpad
 */

const FUSHUMA_CHAIN_ID = 121224;

export const FUMA_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  '0x0000000000000000000000000000000000000000', // Native token placeholder
  18,
  'FUMA',
  'Fushuma Token'
);

export const WFUMA_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // Deployed
  18,
  'WFUMA',
  'Wrapped FUMA'
);

// Using actual deployed addresses from launchpad
export const USDC_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  PAYMENT_TOKENS.USDC, // 0xf8EA5627691E041dae171350E8Df13c592084848
  6,
  'USDC',
  'USD Coin'
);

export const USDT_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  PAYMENT_TOKENS.USDT, // 0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e
  6,
  'USDT',
  'Tether USD'
);

export const WETH_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  '0x0000000000000000000000000000000000000000', // To be deployed
  18,
  'WETH',
  'Wrapped Ether'
);

export const WBTC_TOKEN = new Token(
  FUSHUMA_CHAIN_ID,
  '0x0000000000000000000000000000000000000000', // To be deployed
  8,
  'WBTC',
  'Wrapped Bitcoin'
);

/**
 * List of common base tokens for trading pairs
 */
export const BASES_TO_CHECK_TRADES_AGAINST = [
  WFUMA_TOKEN,
  USDC_TOKEN,
  USDT_TOKEN,
  WETH_TOKEN,
  WBTC_TOKEN,
];

/**
 * Default token list for the swap interface
 * Only includes tokens with deployed contracts
 * Note: FUMA (native) is excluded - use WFUMA for liquidity pairs
 */
export const DEFAULT_TOKEN_LIST = [
  WFUMA_TOKEN,
  USDC_TOKEN,
  USDT_TOKEN,
  WETH_TOKEN,
  WBTC_TOKEN,
];

/**
 * Tokens that are actually deployed and can be used
 * (excludes placeholder addresses)
 */
export const DEPLOYED_TOKENS = [
  WFUMA_TOKEN,
  USDC_TOKEN,
  USDT_TOKEN,
];

/**
 * Token list for liquidity provision
 * Only includes tokens that can be used in liquidity pairs
 * (excludes native FUMA, use WFUMA instead)
 */
export const LIQUIDITY_TOKEN_LIST = [
  WFUMA_TOKEN,
  USDC_TOKEN,
  USDT_TOKEN,
];

/**
 * Create a token instance from address and metadata
 */
export function createToken(
  address: `0x${string}`,
  decimals: number,
  symbol: string,
  name: string
): Token {
  return new Token(FUSHUMA_CHAIN_ID, address, decimals, symbol, name);
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string): Token | undefined {
  return DEFAULT_TOKEN_LIST.find((token) => token.symbol === symbol);
}

/**
 * Get token by address
 */
export function getTokenByAddress(address: string): Token | undefined {
  return DEFAULT_TOKEN_LIST.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Check if token is native FUMA
 */
export function isNativeFUMA(token: Token): boolean {
  return token.address === '0x0000000000000000000000000000000000000000';
}

/**
 * Check if token is WFUMA
 */
export function isWFUMA(token: Token): boolean {
  return token.symbol === 'WFUMA';
}

/**
 * Check if token address is a placeholder (not deployed)
 */
export function isPlaceholderAddress(address: string): boolean {
  return address === '0x0000000000000000000000000000000000000000';
}

/**
 * Check if token is deployed and usable
 */
export function isTokenDeployed(token: Token): boolean {
  return !isPlaceholderAddress(token.address) || isNativeFUMA(token);
}
```

---

**Document Generated:** November 19, 2025  
**Total Files:** 15+  
**Total Lines of Code:** ~5,000+ lines
