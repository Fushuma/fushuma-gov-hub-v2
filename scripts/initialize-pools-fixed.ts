/**
 * Initialize Liquidity Pools Script (CORRECTED)
 * 
 * This script initializes the following pools with CORRECT parameters encoding:
 * 1. WFUMA/USDT - 0.3% fee - 1 WFUMA = 0.15 USDT
 * 2. WFUMA/USDC - 0.3% fee - 1 WFUMA = 0.15 USDC
 */

import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

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

// Contract addresses
const CL_POOL_MANAGER_ADDRESS = '0x9123DeC6d2bE7091329088BA1F8Dc118eEc44f7a';
const WFUMA_ADDRESS = '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E';
const USDT_ADDRESS = '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e';
const USDC_ADDRESS = '0xf8EA5627691E041dae171350E8Df13c592084848';

// Fee tier: 3000 = 0.3%
const FEE_TIER = 3000;

// Tick spacing: 60 (CORRECTED - for 0.3% fee tier)
// This matches the MEDIUM fee tier (0.25%-0.3%)
const TICK_SPACING = 60;

// CLPoolManager ABI (only initialize function)
const CLPoolManagerABI = [
  {
    type: 'function',
    name: 'initialize',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'hooks', type: 'address' },
          { name: 'poolManager', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'parameters', type: 'bytes32' },
        ],
      },
      { name: 'sqrtPriceX96', type: 'uint160' },
    ],
    outputs: [{ name: 'tick', type: 'int24' }],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * Encode tick spacing into the parameters field
 * 
 * CORRECTED IMPLEMENTATION:
 * - Bits [0-15]: Reserved for hooks (set to 0)
 * - Bits [16-39]: Tick spacing (shifted left by 16 bits)
 * - Bits [40-255]: Unused
 */
function encodePoolParameters(tickSpacing: number): `0x${string}` {
  // Shift tick spacing left by 16 bits to place it in bits [16-39]
  const tickSpacingShifted = BigInt(tickSpacing) << 16n;
  
  // Convert to hex string and pad to 64 characters (32 bytes)
  const parameters = `0x${tickSpacingShifted.toString(16).padStart(64, '0')}` as `0x${string}`;
  
  console.log(`  Tick spacing: ${tickSpacing}`);
  console.log(`  Tick spacing shifted: 0x${tickSpacingShifted.toString(16)}`);
  console.log(`  Parameters (bytes32): ${parameters}`);
  
  return parameters;
}

/**
 * Calculate sqrtPriceX96 from price
 * Formula: sqrtPriceX96 = sqrt(price) * 2^96
 * 
 * For WFUMA/USDT where 1 WFUMA = 0.15 USDT:
 * - WFUMA has 18 decimals
 * - USDT has 6 decimals
 * - Price needs to account for decimal difference
 */
function calculateSqrtPriceX96(
  price: number,
  token0Decimals: number,
  token1Decimals: number
): bigint {
  // Adjust price for decimal difference
  const decimalAdjustment = 10 ** (token1Decimals - token0Decimals);
  const adjustedPrice = price * decimalAdjustment;
  
  // Calculate sqrt(price) * 2^96
  const sqrtPrice = Math.sqrt(adjustedPrice);
  const Q96 = 2n ** 96n;
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));
  
  return sqrtPriceX96;
}

/**
 * Sort tokens by address (required by Uniswap V3/V4)
 */
function sortTokens(tokenA: string, tokenB: string): [string, string] {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
}

async function main() {
  // Get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable not set');
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('🔑 Using account:', account.address);

  // Create clients
  const publicClient = createPublicClient({
    chain: fushuma,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: fushuma,
    transport: http(),
  });

  console.log('\n📊 Initializing pools with CORRECTED parameters encoding...\n');

  // Pool 1: WFUMA/USDT
  console.log('=== Pool 1: WFUMA/USDT ===');
  const [token0_pool1, token1_pool1] = sortTokens(WFUMA_ADDRESS, USDT_ADDRESS);
  const isWFUMAToken0_pool1 = token0_pool1.toLowerCase() === WFUMA_ADDRESS.toLowerCase();
  
  // Calculate price (if WFUMA is token0, price = 0.15, else price = 1/0.15)
  const price_pool1 = isWFUMAToken0_pool1 ? 0.15 : 1 / 0.15;
  const sqrtPriceX96_pool1 = calculateSqrtPriceX96(
    price_pool1,
    isWFUMAToken0_pool1 ? 18 : 6, // token0 decimals
    isWFUMAToken0_pool1 ? 6 : 18  // token1 decimals
  );

  console.log('Token0:', token0_pool1, isWFUMAToken0_pool1 ? '(WFUMA)' : '(USDT)');
  console.log('Token1:', token1_pool1, isWFUMAToken0_pool1 ? '(USDT)' : '(WFUMA)');
  console.log('Price:', price_pool1);
  console.log('sqrtPriceX96:', sqrtPriceX96_pool1.toString());

  // CORRECTED: Encode tick spacing properly
  const parameters1 = encodePoolParameters(TICK_SPACING);
  
  const poolKey1 = {
    currency0: token0_pool1 as `0x${string}`,
    currency1: token1_pool1 as `0x${string}`,
    hooks: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    poolManager: CL_POOL_MANAGER_ADDRESS as `0x${string}`,
    fee: FEE_TIER,
    parameters: parameters1,
  };

  try {
    const hash1 = await walletClient.writeContract({
      address: CL_POOL_MANAGER_ADDRESS as `0x${string}`,
      abi: CLPoolManagerABI,
      functionName: 'initialize',
      args: [poolKey1, sqrtPriceX96_pool1],
    });

    console.log('✅ Transaction sent:', hash1);
    console.log('⏳ Waiting for confirmation...');

    const receipt1 = await publicClient.waitForTransactionReceipt({ hash: hash1 });
    console.log('✅ Pool 1 initialized! Block:', receipt1.blockNumber);
  } catch (error: any) {
    if (error.message?.includes('PoolAlreadyInitialized')) {
      console.log('⚠️  Pool 1 already initialized');
    } else {
      console.error('❌ Error initializing pool 1:', error.message);
      throw error;
    }
  }

  console.log('\n=== Pool 2: WFUMA/USDC ===');
  const [token0_pool2, token1_pool2] = sortTokens(WFUMA_ADDRESS, USDC_ADDRESS);
  const isWFUMAToken0_pool2 = token0_pool2.toLowerCase() === WFUMA_ADDRESS.toLowerCase();
  
  // Calculate price (if WFUMA is token0, price = 0.15, else price = 1/0.15)
  const price_pool2 = isWFUMAToken0_pool2 ? 0.15 : 1 / 0.15;
  const sqrtPriceX96_pool2 = calculateSqrtPriceX96(
    price_pool2,
    isWFUMAToken0_pool2 ? 18 : 6, // token0 decimals
    isWFUMAToken0_pool2 ? 6 : 18  // token1 decimals
  );

  console.log('Token0:', token0_pool2, isWFUMAToken0_pool2 ? '(WFUMA)' : '(USDC)');
  console.log('Token1:', token1_pool2, isWFUMAToken0_pool2 ? '(USDC)' : '(WFUMA)');
  console.log('Price:', price_pool2);
  console.log('sqrtPriceX96:', sqrtPriceX96_pool2.toString());

  // CORRECTED: Encode tick spacing properly
  const parameters2 = encodePoolParameters(TICK_SPACING);
  
  const poolKey2 = {
    currency0: token0_pool2 as `0x${string}`,
    currency1: token1_pool2 as `0x${string}`,
    hooks: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    poolManager: CL_POOL_MANAGER_ADDRESS as `0x${string}`,
    fee: FEE_TIER,
    parameters: parameters2,
  };

  try {
    const hash2 = await walletClient.writeContract({
      address: CL_POOL_MANAGER_ADDRESS as `0x${string}`,
      abi: CLPoolManagerABI,
      functionName: 'initialize',
      args: [poolKey2, sqrtPriceX96_pool2],
    });

    console.log('✅ Transaction sent:', hash2);
    console.log('⏳ Waiting for confirmation...');

    const receipt2 = await publicClient.waitForTransactionReceipt({ hash: hash2 });
    console.log('✅ Pool 2 initialized! Block:', receipt2.blockNumber);
  } catch (error: any) {
    if (error.message?.includes('PoolAlreadyInitialized')) {
      console.log('⚠️  Pool 2 already initialized');
    } else {
      console.error('❌ Error initializing pool 2:', error.message);
      throw error;
    }
  }

  console.log('\n🎉 All pools initialized successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
