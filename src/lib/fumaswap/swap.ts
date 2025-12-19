/**
 * FumaSwap V4 Swap Utilities
 *
 * Integration with deployed Universal Router
 */
import type { Token } from '@pancakeswap/sdk';
import type { Address } from 'viem';
import { encodePacked, parseUnits, formatUnits, encodeAbiParameters, parseAbiParameters, createPublicClient, http } from 'viem';
import { UNIVERSAL_ROUTER_ADDRESS, CL_QUOTER_ADDRESS, CL_POOL_MANAGER_ADDRESS, FeeAmount, TICK_SPACINGS } from './contracts';
import { getParametersForFee } from './poolKeyHelper';

export interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  route: string[];
  fee: number;
  minimumOutput: string;
  executionPrice: string;
  midPrice: string;
}

export interface SwapParams {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  slippageTolerance: number; // in percentage (e.g., 0.5 for 0.5%)
  deadline: number; // in minutes
  recipient: Address;
}

// Fee tiers to try in order of preference
const FEE_TIERS = [3000, 500, 10000, 100]; // 0.3%, 0.05%, 1%, 0.01%

// Universal Router command codes
const Commands = {
  V4_SWAP: '0x00',
  PERMIT2_TRANSFER_FROM: '0x0d',
  SWEEP: '0x04',
} as const;

// Known pools with their fee tiers for optimization
const KNOWN_POOL_FEES: Record<string, number> = {
  // USDT-WFUMA
  '0x1e11d176117dbedbD234b1c6a10c6eb8dceD275e-0xbca7b11c788dbb85be92627ef1e60a2a9b7e2c6e': 3000,
  '0xbca7b11c788dbb85be92627ef1e60a2a9b7e2c6e-0x1e11d176117dbedbD234b1c6a10c6eb8dceD275e': 3000,
};

// Fushuma chain for creating clients
const fushuma = {
  id: 121224,
  name: 'Fushuma',
  network: 'fushuma',
  nativeCurrency: { decimals: 18, name: 'FUMA', symbol: 'FUMA' },
  rpcUrls: {
    default: { http: ['https://rpc.fushuma.com'] },
    public: { http: ['https://rpc.fushuma.com'] },
  },
} as const;

// CLPoolManager ABI for fetching pool state
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

/**
 * Get the best fee tier for a token pair
 */
async function getBestFeeTier(tokenIn: Token, tokenOut: Token): Promise<number> {
  // Check known pools first
  const pairKey = `${tokenIn.address.toLowerCase()}-${tokenOut.address.toLowerCase()}`;
  if (KNOWN_POOL_FEES[pairKey]) {
    return KNOWN_POOL_FEES[pairKey];
  }

  // Try to find an active pool by checking liquidity
  const { publicClient } = await import('@/lib/viem');
  const { keccak256, encodeAbiParameters, parseAbiParameters } = await import('viem');

  const token0 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenIn : tokenOut;
  const token1 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenOut : tokenIn;

  for (const fee of FEE_TIERS) {
    try {
      const parameters = getParametersForFee(fee as FeeAmount);
      const poolId = keccak256(
        encodeAbiParameters(
          parseAbiParameters('address, address, address, address, uint24, bytes32'),
          [
            token0.address as Address,
            token1.address as Address,
            '0x0000000000000000000000000000000000000000' as Address,
            CL_POOL_MANAGER_ADDRESS as Address,
            fee,
            parameters,
          ]
        )
      );

      const liquidity = await publicClient.readContract({
        address: CL_POOL_MANAGER_ADDRESS as Address,
        abi: CLPoolManagerABI,
        functionName: 'getLiquidity',
        args: [poolId],
      });

      if (liquidity > 0n) {
        return fee;
      }
    } catch (error) {
      // Pool doesn't exist with this fee tier, try next
      continue;
    }
  }

  // Default to 0.3% if no pool found
  return 3000;
}

/**
 * Calculate price impact from input/output amounts and mid price
 */
function calculatePriceImpact(
  inputAmount: bigint,
  outputAmount: bigint,
  sqrtPriceX96: bigint,
  decimalsIn: number,
  decimalsOut: number,
  zeroForOne: boolean
): number {
  try {
    // Calculate mid price from sqrtPriceX96
    const Q96 = BigInt(2) ** BigInt(96);
    const priceX192 = sqrtPriceX96 * sqrtPriceX96;

    let midPrice: number;
    if (zeroForOne) {
      // Price of token0 in terms of token1
      midPrice = Number(priceX192 * BigInt(10 ** decimalsIn)) / Number(Q96 * Q96 * BigInt(10 ** decimalsOut));
    } else {
      // Price of token1 in terms of token0
      midPrice = Number(Q96 * Q96 * BigInt(10 ** decimalsIn)) / Number(priceX192 * BigInt(10 ** decimalsOut));
    }

    // Calculate execution price
    const inputNum = Number(formatUnits(inputAmount, decimalsIn));
    const outputNum = Number(formatUnits(outputAmount, decimalsOut));
    const executionPrice = outputNum / inputNum;

    // Price impact = (midPrice - executionPrice) / midPrice * 100
    const priceImpact = Math.abs((midPrice - executionPrice) / midPrice) * 100;

    return Math.min(priceImpact, 100); // Cap at 100%
  } catch (error) {
    console.error('Error calculating price impact:', error);
    return 0;
  }
}

/**
 * Get swap quote from the CLQuoter contract with dynamic fee tier
 */
export async function getSwapQuote(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string
): Promise<SwapQuote | null> {
  try {
    const { publicClient } = await import('@/lib/viem');
    const CLQuoterABI = (await import('./abis/CLQuoter.json')).default;
    const { keccak256, encodeAbiParameters, parseAbiParameters } = await import('viem');

    // Parse input amount
    const amountInWei = parseUnits(amountIn, tokenIn.decimals);

    // Determine swap direction (zeroForOne)
    const token0 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenIn : tokenOut;
    const token1 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenOut : tokenIn;
    const zeroForOne = tokenIn.address.toLowerCase() === token0.address.toLowerCase();

    // Get the best fee tier dynamically
    const fee = await getBestFeeTier(tokenIn, tokenOut);
    const parameters = getParametersForFee(fee as FeeAmount);

    // Calculate pool ID for fetching current price
    const poolId = keccak256(
      encodeAbiParameters(
        parseAbiParameters('address, address, address, address, uint24, bytes32'),
        [
          token0.address as Address,
          token1.address as Address,
          '0x0000000000000000000000000000000000000000' as Address,
          CL_POOL_MANAGER_ADDRESS as Address,
          fee,
          parameters,
        ]
      )
    );

    // Prepare quote parameters with correct structure
    const quoteParams = {
      poolKey: {
        currency0: token0.address as Address,
        currency1: token1.address as Address,
        hooks: '0x0000000000000000000000000000000000000000' as Address,
        poolManager: CL_POOL_MANAGER_ADDRESS as Address,
        fee: fee,
        parameters: parameters,
      },
      zeroForOne,
      exactAmount: amountInWei,
      hookData: '0x' as `0x${string}`,
    };

    // Get current pool state for price impact calculation
    let sqrtPriceX96 = BigInt(0);
    try {
      const slot0 = await publicClient.readContract({
        address: CL_POOL_MANAGER_ADDRESS as Address,
        abi: CLPoolManagerABI,
        functionName: 'getSlot0',
        args: [poolId],
      });
      sqrtPriceX96 = slot0[0];
    } catch (e) {
      console.warn('Could not fetch pool state for price impact calculation');
    }

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

    // Calculate price impact
    const priceImpact = sqrtPriceX96 > 0n
      ? calculatePriceImpact(amountInWei, outputAmount, sqrtPriceX96, tokenIn.decimals, tokenOut.decimals, zeroForOne)
      : 0;

    // Calculate execution price
    const inputNum = parseFloat(amountIn);
    const outputNum = parseFloat(outputAmountFormatted);
    const executionPrice = outputNum > 0 ? (inputNum / outputNum).toFixed(8) : '0';

    // Calculate mid price from sqrtPriceX96
    let midPrice = '0';
    if (sqrtPriceX96 > 0n) {
      const Q96 = BigInt(2) ** BigInt(96);
      const priceX192 = sqrtPriceX96 * sqrtPriceX96;
      const midPriceNum = zeroForOne
        ? Number(priceX192 * BigInt(10 ** tokenIn.decimals)) / Number(Q96 * Q96 * BigInt(10 ** tokenOut.decimals))
        : Number(Q96 * Q96 * BigInt(10 ** tokenIn.decimals)) / Number(priceX192 * BigInt(10 ** tokenOut.decimals));
      midPrice = midPriceNum.toFixed(8);
    }

    return {
      inputAmount: amountIn,
      outputAmount: outputAmountFormatted,
      priceImpact: Math.round(priceImpact * 100) / 100, // Round to 2 decimal places
      route: [tokenIn.symbol!, tokenOut.symbol!],
      fee: fee,
      minimumOutput: (parseFloat(outputAmountFormatted) * 0.995).toFixed(6), // 0.5% slippage
      executionPrice,
      midPrice,
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
    executionPrice: (1 / rate).toFixed(8),
    midPrice: (1 / rate).toFixed(8),
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
