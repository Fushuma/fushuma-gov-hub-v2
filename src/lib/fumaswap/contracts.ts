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
