/**
 * What the snapshot covers.
 *
 * Addresses are imported from the app's own registries rather than copied, so
 * that a contract redeployment cannot leave the snapshot silently pointing at
 * a dead address. If you deploy something new before the fork, add it there
 * and it is picked up here.
 */

import { CONTRACTS } from '../../../src/lib/contracts';
import { GOVERNANCE_CONTRACTS } from '../../../src/lib/governance/contracts';
import { BRIDGE_CONTRACTS } from '../../../src/lib/bridge/constants/bridgeContracts';
import { normalizeAddress, type Hex } from '../../../src/lib/snapshot/hex';

export interface ContractEntry {
  label: string;
  address: Hex;
  category: 'governance' | 'defi' | 'infrastructure' | 'launchpad' | 'bridge';
}

export interface TokenEntry {
  label: string;
  address: Hex;
  /** Decimals are re-read on chain during the export; this is only a label. */
  decimals: number;
}

/**
 * DeFi, launchpad and bridge addresses. Mirrors docs/DEPLOYED_CONTRACTS.md.
 * Kept literal here rather than imported from src/lib/fumaswap/contracts.ts so
 * the exporter does not pull the PancakeSwap SDK into a node script.
 */
const DEFI_CONTRACTS: Record<string, string> = {
  Vault: '0x9c6bAfE545fF2d31B0abef12F4724DCBfB08c839',
  CLPoolManager: '0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e',
  BinPoolManager: '0xD5F370971602DB2D449a6518f55fCaFBd1a51143',
  CLQuoter: '0x011E0e62711fd38e0AF68A7E9f7c37bb32b49660',
  CLPositionDescriptor: '0x8744C9Ec3f61c72Acb41801B7Db95fC507d20cd5',
  CLPositionManager: '0x750525284ec59F21CF1c03C62A062f6B6473B7b1',
  BinQuoter: '0x33ae227f70bcdce9cafbc05d37f93f187aa4f913',
  BinPositionManager: '0x1842651310c3BD344E58CDb84c1B96a386998e04',
  MixedQuoter: '0x0Ea2c4B7990EB44f2E9a106b159C165e702dF98d',
  FumaInfinityRouter: '0x662F4e8CdB064B58FE686AFCd2ceDbB921a0f11f',
};

const INFRA_CONTRACTS: Record<string, string> = {
  WFUMA: CONTRACTS.WFUMA,
  USDC: '0xf8EA5627691E041dae171350E8Df13c592084848',
  USDT: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e',
  Permit2: '0x1d5E963f9581F5416Eae6C9978246B7dDf559Ff0',
};

const LAUNCHPAD_CONTRACTS: Record<string, string> = {
  LaunchpadProxy: '0x206236eca2dF8FB37EF1d024e1F72f4313f413E4',
  VestingImplementation: '0x0d8e696475b233193d21E565C21080EbF6A3C5DA',
};

const FUSHUMA_CHAIN_ID = 121224;

/**
 * The bridge is deployed at one address across every connected chain. The
 * Fushuma-side deployment is what this snapshot reads; the others keep running
 * through a fork and have to be reconciled against it.
 */
export const BRIDGE_ADDRESS: Hex = normalizeAddress(
  BRIDGE_CONTRACTS[FUSHUMA_CHAIN_ID],
);

/** Every chain the bridge mesh spans, Fushuma first. */
export const BRIDGE_CHAIN_IDS: number[] = Object.keys(BRIDGE_CONTRACTS)
  .map(Number)
  .sort((a, b) => (a === FUSHUMA_CHAIN_ID ? -1 : b === FUSHUMA_CHAIN_ID ? 1 : a - b));

/** Foreign chains only - the ones that do NOT fork with Fushuma. */
export const FOREIGN_BRIDGE_CHAIN_IDS: number[] = BRIDGE_CHAIN_IDS.filter(
  (chainId) => chainId !== FUSHUMA_CHAIN_ID,
);

export function bridgeAddressFor(chainId: number): Hex | null {
  const address = BRIDGE_CONTRACTS[chainId];
  return address ? normalizeAddress(address) : null;
}

const BRIDGE_REGISTRY: Record<string, string> = {
  Bridge: BRIDGE_CONTRACTS[FUSHUMA_CHAIN_ID],
};

function entries(
  source: Record<string, string>,
  category: ContractEntry['category'],
): ContractEntry[] {
  return Object.entries(source)
    .filter(([, address]) => !/^0x0{40}$/i.test(address))
    .map(([label, address]) => ({
      label,
      address: normalizeAddress(address),
      category,
    }));
}

/** Every contract whose storage and app-level state the snapshot records. */
export const TRACKED_CONTRACTS: ContractEntry[] = [
  ...entries(GOVERNANCE_CONTRACTS, 'governance'),
  ...entries(DEFI_CONTRACTS, 'defi'),
  ...entries(INFRA_CONTRACTS, 'infrastructure'),
  ...entries(LAUNCHPAD_CONTRACTS, 'launchpad'),
  ...entries(BRIDGE_REGISTRY, 'bridge'),
];

/**
 * ERC-20s whose full holder set is rebuilt from Transfer logs. WFUMA matters
 * most: it is the governance staking asset, so every holder must survive the
 * fork with the right balance.
 */
export const TRACKED_TOKENS: TokenEntry[] = [
  { label: 'WFUMA', address: normalizeAddress(CONTRACTS.WFUMA), decimals: 18 },
  { label: 'USDC', address: normalizeAddress(INFRA_CONTRACTS.USDC), decimals: 6 },
  { label: 'USDT', address: normalizeAddress(INFRA_CONTRACTS.USDT), decimals: 6 },
];

export function contractByLabel(label: string): ContractEntry {
  const found = TRACKED_CONTRACTS.find((entry) => entry.label === label);
  if (!found) throw new Error(`Unknown contract label: ${label}`);
  return found;
}

/** Deduplicated address set for the tracked contracts. */
export function trackedAddresses(): Hex[] {
  return [...new Set(TRACKED_CONTRACTS.map((entry) => entry.address))].sort();
}
