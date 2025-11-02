/**
 * Bridge Contract Addresses
 * Ported from Bridge application
 */

export const BRIDGE_CONTRACTS: { [chainId: number]: `0x${string}` } = {
  97: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462', // BSC Testnet
  56: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462', // BSC Mainnet
  42: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462', // Kovan
  1: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462', // Ethereum Mainnet
  61: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462', // Ethereum Classic
  137: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462', // Polygon
  121224: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462', // Fushuma
  42161: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462', // Arbitrum
  130: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462', // Huobi ECO Chain
  8453: '0x7304ac11BE92A013dA2a8a9D77330eA5C1531462' // Base
};

export const SOY_ROUTER_CONTRACTS: { [chainId: number]: `0x${string}` } = {
  820: '0xeB5B468fAacC6bBdc14c4aacF0eec38ABCCC13e7',
  20729: '0xdbe46b17FFd35D6865b69F9398AC5454389BF38c',
  199: '0x8Cb2e43e5AEB329de592F7e49B6c454649b61929'
};

/**
 * Get bridge contract address for a specific chain
 */
export function getBridgeAddress(chainId: number | undefined): `0x${string}` | undefined {
  if (!chainId) return undefined;
  return BRIDGE_CONTRACTS[chainId];
}

/**
 * Get SOY router contract address for a specific chain
 */
export function getSoyRouterAddress(chainId: number | undefined): `0x${string}` | undefined {
  if (!chainId) return undefined;
  return SOY_ROUTER_CONTRACTS[chainId];
}
