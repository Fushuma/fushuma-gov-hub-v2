/**
 * FumaSwap V4 Contract Addresses on Fushuma Network
 * 
 * Paris EVM Compatible Version - Deployed Nov 16, 2025
 * Modified to use regular storage instead of transient storage
 */

export const FUSHUMA_CONTRACTS = {
  // Core Contracts (Paris EVM Compatible)
  vault: '0x4FB212Ed5038b0EcF2c8322B3c71FC64d66073A1', // ✅ Deployed
  clPoolManager: '0x9123DeC6d2bE7091329088BA1F8Dc118eEc44f7a', // ✅ Deployed
  binPoolManager: '0x3014809fBFF942C485A9F527242eC7C5A9ddC765', // ✅ Deployed
  
  // Periphery Contracts
  clQuoter: '0x9C82E4098805a00eAE3CE96D1eBFD117CeB1fAF8', // ✅ Deployed
  clPositionManager: '0x0000000000000000000000000000000000000000', // ⏳ Pending (OpenZeppelin mcopy issue)
  infinityRouter: '0x0000000000000000000000000000000000000000', // To be deployed
  mixedQuoter: '0x0000000000000000000000000000000000000000', // ⏳ Skipped (uses transient storage)
  
  // Protocol Governance
  clProtocolFeeController: '0x0000000000000000000000000000000000000000', // To be deployed
  clPoolManagerOwner: '0x0000000000000000000000000000000000000000', // To be deployed
  
  // Standard Contracts
  permit2: '0x1d5E963f9581F5416Eae6C9978246B7dDf559Ff0', // ✅ Deployed
  wfuma: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // ✅ Wrapped FUMA
  
  // Custom Hooks
  fumaDiscountHook: '0x0000000000000000000000000000000000000000', // To be deployed
  launchpadHook: '0x0000000000000000000000000000000000000000', // To be deployed
} as const;

export const FUSHUMA_TESTNET_CONTRACTS = {
  // Testnet contract addresses (if testnet is available)
  vault: '0x0000000000000000000000000000000000000000',
  clPoolManager: '0x0000000000000000000000000000000000000000',
  clPositionManager: '0x0000000000000000000000000000000000000000',
  infinityRouter: '0x0000000000000000000000000000000000000000',
  mixedQuoter: '0x0000000000000000000000000000000000000000',
  clQuoter: '0x0000000000000000000000000000000000000000',
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
export const TICK_SPACINGS: { [amount in SDKFeeAmount]: number } = {
  [SDKFeeAmount.LOWEST]: 1,
  [SDKFeeAmount.LOW]: 10,
  [SDKFeeAmount.MEDIUM]: 60,
  [SDKFeeAmount.HIGH]: 200,
};

// Export individual contract addresses for easier imports
export const VAULT_ADDRESS = FUSHUMA_CONTRACTS.vault;
export const CL_POOL_MANAGER_ADDRESS = FUSHUMA_CONTRACTS.clPoolManager;
export const BIN_POOL_MANAGER_ADDRESS = FUSHUMA_CONTRACTS.binPoolManager;
export const CL_POSITION_MANAGER_ADDRESS = FUSHUMA_CONTRACTS.clPositionManager;
export const CL_QUOTER_ADDRESS = FUSHUMA_CONTRACTS.clQuoter;
export const INFINITY_ROUTER_ADDRESS = FUSHUMA_CONTRACTS.infinityRouter;
export const MIXED_QUOTER_ADDRESS = FUSHUMA_CONTRACTS.mixedQuoter;
export const PERMIT2_ADDRESS = FUSHUMA_CONTRACTS.permit2;
export const WFUMA_ADDRESS = FUSHUMA_CONTRACTS.wfuma;
export const FUMA_DISCOUNT_HOOK_ADDRESS = FUSHUMA_CONTRACTS.fumaDiscountHook;
export const LAUNCHPAD_HOOK_ADDRESS = FUSHUMA_CONTRACTS.launchpadHook;
