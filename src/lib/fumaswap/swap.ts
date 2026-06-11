/**
 * FumaSwap V4 Swap Utilities
 *
 * Integration with deployed Universal Router
 */
import type { Token } from '@pancakeswap/sdk';
import type { Address } from 'viem';
import { encodePacked, parseUnits, formatUnits } from 'viem';
import { UNIVERSAL_ROUTER_ADDRESS, CL_QUOTER_ADDRESS, CL_POOL_MANAGER_ADDRESS, FeeAmount } from './contracts';
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

// Universal Router command codes (PancakeSwap Infinity Universal Router)
const Commands = {
  INFI_SWAP: '0x10',
  SWEEP: '0x04',
} as const;

// Known pools with their fee tiers for optimization
const KNOWN_POOL_FEES: Record<string, number> = {
  // USDT-WFUMA
  '0x1e11d176117dbedbD234b1c6a10c6eb8dceD275e-0xbca7b11c788dbb85be92627ef1e60a2a9b7e2c6e': 3000,
  '0xbca7b11c788dbb85be92627ef1e60a2a9b7e2c6e-0x1e11d176117dbedbD234b1c6a10c6eb8dceD275e': 3000,
};

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

  // Probe every fee tier and pick the pool with the deepest liquidity -
  // returning the first non-empty pool could route through a dust pool
  // with terrible execution
  const liquidities = await Promise.all(
    FEE_TIERS.map(async (fee) => {
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

        return { fee, liquidity };
      } catch {
        // Pool doesn't exist with this fee tier
        return { fee, liquidity: 0n };
      }
    })
  );

  const best = liquidities.reduce((a, b) => (b.liquidity > a.liquidity ? b : a));
  if (best.liquidity > 0n) {
    return best.fee;
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
  amountIn: string,
  slippageTolerance: number = 0.5 // in percent, e.g. 0.5 for 0.5%
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

    // Calculate execution price (output per input, same units as midPrice)
    const inputNum = parseFloat(amountIn);
    const outputNum = parseFloat(outputAmountFormatted);
    const executionPrice = inputNum > 0 ? (outputNum / inputNum).toFixed(8) : '0';

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
      minimumOutput: calculateMinimumOutput(outputAmountFormatted, slippageTolerance),
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
 * Execute a swap transaction using the Infinity Universal Router.
 *
 * Encodes an INFI_SWAP command whose input is the planner-encoded action
 * list (CL_SWAP_EXACT_IN_SINGLE -> SETTLE_ALL -> TAKE_ALL), matching the
 * PancakeSwap Infinity router. Input tokens are pulled via Permit2, so
 * the caller must hold a Permit2 allowance for the router (see permit2.ts).
 */
export async function executeSwap(
  params: SwapParams,
  writeContract: any
): Promise<{ hash: Address } | null> {
  try {
    const { tokenIn, tokenOut, amountIn, slippageTolerance, deadline } = params;
    const { ActionsPlanner } = await import('./utils/ActionsPlanner');
    const { ACTIONS } = await import('./utils/constants');

    // Parse amounts
    const amountInWei = parseUnits(amountIn, tokenIn.decimals);

    // Get quote (with the user's slippage tolerance) for the minimum output
    const quote = await getSwapQuote(tokenIn, tokenOut, amountIn, slippageTolerance);
    if (!quote) {
      throw new Error('Failed to get swap quote');
    }

    const minAmountOut = parseUnits(quote.minimumOutput, tokenOut.decimals);

    // Calculate deadline timestamp
    const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + deadline * 60);

    // Pool key must match the pool the quote was computed against
    const token0 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenIn : tokenOut;
    const token1 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase() ? tokenOut : tokenIn;
    const zeroForOne = tokenIn.address.toLowerCase() === token0.address.toLowerCase();
    const poolKey = {
      currency0: token0.address as Address,
      currency1: token1.address as Address,
      hooks: '0x0000000000000000000000000000000000000000' as Address,
      poolManager: CL_POOL_MANAGER_ADDRESS as Address,
      fee: quote.fee,
      parameters: getParametersForFee(quote.fee as FeeAmount),
    };

    const planner = new ActionsPlanner();
    planner.add(ACTIONS.CL_SWAP_EXACT_IN_SINGLE, [
      {
        poolKey,
        zeroForOne,
        amountIn: amountInWei,
        amountOutMinimum: minAmountOut,
        hookData: '0x' as `0x${string}`,
      },
    ]);
    // Pay the input currency (pulled from the user via Permit2)...
    planner.add(ACTIONS.SETTLE_ALL, [tokenIn.address as Address, amountInWei]);
    // ...and receive the output currency (sent to the caller)
    planner.add(ACTIONS.TAKE_ALL, [tokenOut.address as Address, minAmountOut]);

    const commands = encodePacked(['bytes1'], [Commands.INFI_SWAP as `0x${string}`]);
    const inputs = [planner.encode()];

    // Execute swap through the Infinity Universal Router
    const result = await writeContract({
      chainId: 121224,
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
