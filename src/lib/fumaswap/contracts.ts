/**
 * FumaSwap V4 Contract Addresses on Fushuma Network
 * 
 * Shanghai EVM + Solidity 0.8.20 - Deployed Nov 20, 2025
 * Complete deployment with Shanghai EVM compatibility
 * All core and periphery contracts deployed and operational
 * 
 * ⚠️ IMPORTANT: These are the ONLY valid contract addresses.
 * Old addresses from previous deployments are deprecated and should NOT be used.
 */

export const FUSHUMA_CONTRACTS = {
  // Core Contracts (Shanghai EVM + Storage-as-Transient Pattern)
  vault: '0x9c6bAfE545fF2d31B0abef12F4724DCBfB08c839', // ✅ Deployed Nov 20, 2025
  clPoolManager: '0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e', // ✅ Deployed Nov 20, 2025
  binPoolManager: '0xD5F370971602DB2D449a6518f55fCaFBd1a51143', // ✅ Deployed Nov 20, 2025
  
  // Periphery Contracts - Concentrated Liquidity
  clQuoter: '0x011E0e62711fd38e0AF68A7E9f7c37bb32b49660', // ✅ Deployed Nov 20, 2025
  clPositionDescriptor: '0x8744C9Ec3f61c72Acb41801B7Db95fC507d20cd5', // ✅ Deployed Nov 20, 2025
  clPositionManager: '0x750525284ec59F21CF1c03C62A062f6B6473B7b1', // ✅ Deployed Nov 20, 2025
  
  // Periphery Contracts - Bin Pools
  binQuoter: '0x33ae227f70bcdce9cafbc05d37f93f187aa4f913', // ✅ Deployed Nov 20, 2025
  binPositionManager: '0x1842651310c3BD344E58CDb84c1B96a386998e04', // ✅ Deployed Nov 20, 2025

  // Mixed Quoter (aggregates CL & Bin quotes)
  mixedQuoter: '0x0Ea2c4B7990EB44f2E9a106b159C165e702dF98d', // ✅ Redeployed Nov 25, 2025 - Shanghai EVM fix
  
  // Router
  fumaInfinityRouter: '0x662F4e8CdB064B58FE686AFCd2ceDbB921a0f11f', // ✅ Deployed Nov 20, 2025
  infinityRouter: '0x662F4e8CdB064B58FE686AFCd2ceDbB921a0f11f', // ✅ Same as fumaInfinityRouter
  
  // Protocol Governance (Not yet deployed)
  clProtocolFeeController: '0x0000000000000000000000000000000000000000', // To be deployed
  clPoolManagerOwner: '0x0000000000000000000000000000000000000000', // To be deployed
  
  // Standard Contracts
  permit2: '0x1d5E963f9581F5416Eae6C9978246B7dDf559Ff0', // ✅ Deployed (unchanged)
  wfuma: '0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E', // ✅ Wrapped FUMA (unchanged)
  
  // Custom Hooks (Not yet deployed)
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
  mixedQuoter: '0x0000000000000000000000000000000000000000',
  infinityRouter: '0x0000000000000000000000000000000000000000',
  fumaInfinityRouter: '0x0000000000000000000000000000000000000000',
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
  USDC: '0xf8EA5627691E041dae171350E8Df13c592084848', // USDC on Fushuma (6 decimals)
  USDT: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e', // USDT on Fushuma (6 decimals)
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
export const MIXED_QUOTER_ADDRESS = FUSHUMA_CONTRACTS.mixedQuoter;
export const INFINITY_ROUTER_ADDRESS = FUSHUMA_CONTRACTS.infinityRouter;
export const FUMA_INFINITY_ROUTER_ADDRESS = FUSHUMA_CONTRACTS.fumaInfinityRouter;
export const UNIVERSAL_ROUTER_ADDRESS = FUSHUMA_CONTRACTS.fumaInfinityRouter; // Alias for backwards compatibility
export const PERMIT2_ADDRESS = FUSHUMA_CONTRACTS.permit2;
export const WFUMA_ADDRESS = FUSHUMA_CONTRACTS.wfuma;
export const FUMA_DISCOUNT_HOOK_ADDRESS = FUSHUMA_CONTRACTS.fumaDiscountHook;
export const LAUNCHPAD_HOOK_ADDRESS = FUSHUMA_CONTRACTS.launchpadHook;

/**
 * Deployment Information
 * 
 * All contracts deployed on November 20, 2025 with Shanghai EVM adaptations.
 * Implementation uses Storage-as-Transient pattern for compatibility.
 * 
 * Gas Cost Impact:
 * - Simple swaps: +7% overhead vs native transient storage
 * - Multi-hop swaps: +12% overhead
 * - Liquidity operations: +8% overhead
 * 
 * Explorer Links:
 * - Vault: https://fumascan.com/address/0x9c6bAfE545fF2d31B0abef12F4724DCBfB08c839
 * - CLPoolManager: https://fumascan.com/address/0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e
 * - BinPoolManager: https://fumascan.com/address/0xD5F370971602DB2D449a6518f55fCaFBd1a51143
 * - CLPositionManager: https://fumascan.com/address/0x750525284ec59F21CF1c03C62A062f6B6473B7b1
 * - BinPositionManager: https://fumascan.com/address/0x1842651310c3BD344E58CDb84c1B96a386998e04
 * - FumaInfinityRouter: https://fumascan.com/address/0x662F4e8CdB064B58FE686AFCd2ceDbB921a0f11f
 * - MixedQuoter: https://fumascan.com/address/0x0Ea2c4B7990EB44f2E9a106b159C165e702dF98d (Redeployed Nov 25, 2025)
 */
