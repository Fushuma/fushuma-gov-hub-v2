/**
 * FumaSwap V4 Swap Utilities
 * 
 * Integration layer for swap operations with deployed contracts
 */

import type { Token } from '@pancakeswap/sdk';
import type { Address } from 'viem';
import { formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { CL_QUOTER_ADDRESS, INFINITY_ROUTER_ADDRESS, VAULT_ADDRESS, PERMIT2_ADDRESS } from './contracts';
import { isPlaceholderAddress } from './tokens';
import CLQuoterABI from './abis/CLQuoter.json';
import InfinityRouterABI from './abis/InfinityRouter.json';
import { publicClient } from '@/lib/viem';

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

/**
 * Get swap quote from the CLQuoter contract
 */
export async function getSwapQuote(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string
): Promise<SwapQuote | null> {
  // Check if CLQuoter is deployed
  if (isPlaceholderAddress(CL_QUOTER_ADDRESS)) {
    console.warn('CLQuoter contract not deployed yet');
    return getMockQuote(tokenIn, tokenOut, amountIn);
  }

  try {
    // Parse input amount
    const amountInWei = parseUnits(amountIn, tokenIn.decimals);
    
    // Prepare quote params
    // Note: This is a simplified version - you may need to adjust based on your pool setup
    const quoteParams = {
      poolKey: {
        currency0: tokenIn.address as Address,
        currency1: tokenOut.address as Address,
        hooks: '0x0000000000000000000000000000000000000000' as Address,
        poolManager: '0x9123DeC6d2bE7091329088BA1F8Dc118eEc44f7a' as Address, // CLPoolManager address
        fee: 3000, // 0.3% fee tier
        parameters: '0x00' as `0x${string}`,
      },
      zeroForOne: true, // Adjust based on token order
      exactAmount: amountInWei,
      sqrtPriceLimitX96: BigInt(0), // No price limit
      hookData: '0x' as `0x${string}`,
    };

    // Call CLQuoter
    const result = await publicClient.readContract({
      address: CL_QUOTER_ADDRESS as Address,
      abi: CLQuoterABI,
      functionName: 'quoteExactInputSingle',
      args: [quoteParams],
    });

    if (!result || !Array.isArray(result) || result.length < 2) {
      console.warn('Invalid quote result, using mock data');
      return getMockQuote(tokenIn, tokenOut, amountIn);
    }

    const [amountOut, gasEstimate] = result as [bigint, bigint];
    const outputAmount = formatUnits(amountOut, tokenOut.decimals);

    return {
      inputAmount: amountIn,
      outputAmount,
      priceImpact: 0.1, // TODO: Calculate actual price impact
      route: [tokenIn.symbol!, tokenOut.symbol!],
      fee: 0.3, // 0.3% fee
      minimumOutput: calculateMinimumOutput(outputAmount, 0.5),
    };
  } catch (error) {
    console.error('Error getting swap quote:', error);
    // Fall back to mock data for development
    return getMockQuote(tokenIn, tokenOut, amountIn);
  }
}

/**
 * Execute a swap transaction using InfinityRouter
 */
export async function executeSwap(
  params: SwapParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  // Check if router is deployed
  if (isPlaceholderAddress(INFINITY_ROUTER_ADDRESS)) {
    throw new Error('InfinityRouter not deployed yet. Swap execution will be available after router deployment.');
  }

  try {
    const { tokenIn, tokenOut, amountIn, slippageTolerance, deadline, recipient } = params;
    
    // Parse amounts
    const amountInWei = parseUnits(amountIn, tokenIn.decimals);
    
    // Get quote to calculate minimum output
    const quote = await getSwapQuote(tokenIn, tokenOut, amountIn);
    if (!quote) {
      throw new Error('Failed to get swap quote');
    }
    
    const minOutputWei = parseUnits(
      calculateMinimumOutput(quote.outputAmount, slippageTolerance), 
      tokenOut.decimals
    );
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + (deadline * 60);
    
    // Determine token order (currency0 < currency1)
    const token0 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenIn : tokenOut;
    const token1 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenOut : tokenIn;
    const zeroForOne = tokenIn.address.toLowerCase() === token0.address.toLowerCase();
    
    // Prepare pool key
    const poolKey = {
      currency0: token0.address as Address,
      currency1: token1.address as Address,
      hooks: '0x0000000000000000000000000000000000000000' as Address,
      poolManager: '0x9123DeC6d2bE7091329088BA1F8Dc118eEc44f7a' as Address, // CLPoolManager
      fee: 3000, // 0.3% fee tier
      parameters: '0x00' as `0x${string}`,
    };
    
    // Prepare swap params
    const swapParams = {
      poolKey,
      zeroForOne,
      amountSpecified: zeroForOne ? amountInWei : -amountInWei, // Negative for exact output
      sqrtPriceLimitX96: BigInt(0), // No price limit
      hookData: '0x' as `0x${string}`,
    };
    
    // Execute swap through InfinityRouter
    // Using the V4CLExactInputSingle action
    const hash = await writeContract({
      address: INFINITY_ROUTER_ADDRESS as Address,
      abi: InfinityRouterABI,
      functionName: 'execute',
      args: [
        // commands: V4_CL_EXACT_INPUT_SINGLE (0x00)
        '0x00',
        // inputs: encoded swap params
        [encodeFunctionData({
          abi: InfinityRouterABI,
          functionName: 'v4CLExactInputSingle',
          args: [swapParams, minOutputWei, recipient],
        })],
        deadlineTimestamp,
      ],
    });
    
    return { hash };
  } catch (error) {
    console.error('Error executing swap:', error);
    throw error;
  }
}

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(
  inputAmount: string,
  outputAmount: string,
  spotPrice: number
): number {
  try {
    const input = parseFloat(inputAmount);
    const output = parseFloat(outputAmount);
    
    if (input === 0 || output === 0 || spotPrice === 0) {
      return 0;
    }

    const executionPrice = input / output;
    const impact = ((executionPrice - spotPrice) / spotPrice) * 100;
    
    return Math.abs(impact);
  } catch (error) {
    return 0;
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
 * Get route description for display
 */
export function getRouteDescription(route: string[]): string {
  if (route.length <= 2) {
    return 'Direct';
  }
  return `Via ${route.slice(1, -1).join(' → ')}`;
}

/**
 * Mock quote for development (fallback when contracts fail)
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
  const outputNum = inputNum * rate;
  
  return {
    inputAmount: amountIn,
    outputAmount: outputNum.toFixed(6),
    priceImpact: 0.1, // Mock 0.1% price impact
    route: [tokenIn.symbol!, tokenOut.symbol!],
    fee: 0.25, // Mock 0.25% fee
    minimumOutput: (outputNum * 0.995).toFixed(6), // 0.5% slippage
  };
}

/**
 * Check if swap is possible between two tokens
 */
export function canSwap(tokenIn: Token, tokenOut: Token): boolean {
  if (!tokenIn || !tokenOut) return false;
  if (tokenIn.address === tokenOut.address) return false;
  
  // Check if router is deployed
  if (isPlaceholderAddress(INFINITY_ROUTER_ADDRESS)) {
    return false;
  }
  
  return true;
}

/**
 * Check if quotes are available (even if swaps aren't)
 */
export function canGetQuotes(): boolean {
  return !isPlaceholderAddress(CL_QUOTER_ADDRESS);
}

/**
 * Estimate gas for swap
 */
export async function estimateSwapGas(params: SwapParams): Promise<bigint> {
  // Mock gas estimate for development
  return BigInt(200000); // ~200k gas
}
