/**
 * FumaSwap V4 Swap Utilities
 * 
 * Integration with deployed Universal Router
 */
import type { Token } from '@pancakeswap/sdk';
import type { Address } from 'viem';
import { encodePacked, parseUnits, formatUnits, encodeAbiParameters, parseAbiParameters } from 'viem';
import { UNIVERSAL_ROUTER_ADDRESS, CL_QUOTER_ADDRESS } from './contracts';

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
    const quoteParams = {
      poolKey: {
        currency0: token0.address as Address,
        currency1: token1.address as Address,
        hooks: '0x0000000000000000000000000000000000000000' as Address,
        poolManager: (await import('./contracts')).CL_POOL_MANAGER_ADDRESS as Address,
        fee: 3000, // 0.3% fee tier
        parameters: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
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
