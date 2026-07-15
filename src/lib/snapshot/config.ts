/**
 * Configuration for the Fushuma migration snapshot.
 *
 * Values come from environment variables where present (so the same tool can
 * target a fork/testnet), falling back to the known Fushuma mainnet settings
 * that the rest of this repo already uses (see src/lib/contracts.ts,
 * src/lib/fumaswap/tokens.ts, docs/DEPLOYED_CONTRACTS.md).
 */

import type { Address, AssetSpec } from "./types";
import { NATIVE_SENTINEL } from "./types";

const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;

export const CHAIN_ID = Number(env.NEXT_PUBLIC_FUSHUMA_CHAIN_ID ?? env.SNAPSHOT_CHAIN_ID ?? 121224);

export const RPC_URL = env.SNAPSHOT_RPC_URL ?? env.NEXT_PUBLIC_FUSHUMA_RPC_URL ?? "https://rpc.fushuma.com";

/**
 * Blockscout-style explorer API base. Fumascan runs Blockscout, which exposes
 * both a v2 REST API (`/api/v2/...`) and a legacy Etherscan-compatible API
 * (`/api?module=...`). We use v2 for enumeration.
 */
export const EXPLORER_API_URL =
  env.SNAPSHOT_EXPLORER_API_URL ?? env.NEXT_PUBLIC_FUSHUMA_EXPLORER ?? "https://fumascan.com";

/** Optional API key for the explorer (Blockscout usually does not require one). */
export const EXPLORER_API_KEY = env.SNAPSHOT_EXPLORER_API_KEY ?? "";

/**
 * Known ERC-20 tokens on Fushuma mainnet, from the deployed-contracts docs.
 * Extend this list (or use explorer token auto-discovery) to snapshot more
 * tokens. Native FUMA is handled separately as `NATIVE_ASSET`.
 */
export const NATIVE_ASSET: AssetSpec = {
  kind: "native",
  symbol: "FUMA",
  decimals: 18,
  address: NATIVE_SENTINEL,
};

export const KNOWN_ERC20S: AssetSpec[] = [
  {
    kind: "erc20",
    symbol: "WFUMA",
    decimals: 18,
    address: "0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E",
  },
  {
    kind: "erc20",
    symbol: "USDC",
    decimals: 6,
    address: "0xf8EA5627691E041dae171350E8Df13c592084848",
  },
  {
    kind: "erc20",
    symbol: "USDT",
    decimals: 6,
    address: "0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e",
  },
];

/**
 * System / infrastructure contracts whose native + token balances are
 * protocol-owned rather than user-owned. By default they are recorded but
 * flagged; the migration team decides whether to migrate or re-seed them.
 * Sourced from docs/DEPLOYED_CONTRACTS.md.
 */
export const SYSTEM_CONTRACTS: Record<string, Address> = {
  Vault: "0x9c6bAfE545fF2d31B0abef12F4724DCBfB08c839",
  CLPoolManager: "0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e",
  BinPoolManager: "0xD5F370971602DB2D449a6518f55fCaFBd1a51143",
  FumaInfinityRouter: "0x662F4e8CdB064B58FE686AFCd2ceDbB921a0f11f",
  WFUMA: "0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E",
  Permit2: "0x1d5E963f9581F5416Eae6C9978246B7dDf559Ff0",
  LaunchpadProxy: "0x206236eca2dF8FB37EF1d024e1F72f4313f413E4",
  Bridge: "0x7304ac11BE92A013dA2a8a9D77330eA5C1531462",
  VotingEscrow: "0x80Ebf301efc7b0FF1825dC3B4e8d69e414eaa26f",
  FushumaGovernor: "0xF36107b3AA203C331284E5A467C1c58bDD5b591D",
};

export interface SnapshotConfig {
  chainId: number;
  rpcUrl: string;
  explorerApiUrl: string;
  explorerApiKey: string;
  /** Block to pin balances to; "latest" reads current head. */
  block: string;
  /** Assets to snapshot (native + selected ERC-20s). */
  assets: AssetSpec[];
  /** Drop balances strictly below this many base units (dust). */
  minBalanceWei: bigint;
  /** If false, contract-held balances are excluded from the claim trees. */
  includeContracts: boolean;
  /** Addresses to always exclude (e.g. burn address, system contracts). */
  excludedAddresses: Set<Address>;
  /** Re-read balances at `block` via RPC instead of trusting explorer values. */
  pinBalancesAtBlock: boolean;
  /** Concurrency + paging knobs for the live collector. */
  requestConcurrency: number;
  pageSize: number;
  maxRetries: number;
}

export const BURN_ADDRESSES: Address[] = [
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dEaD",
];

export function loadConfig(overrides: Partial<SnapshotConfig> = {}): SnapshotConfig {
  const excluded = new Set<Address>(BURN_ADDRESSES);
  return {
    chainId: CHAIN_ID,
    rpcUrl: RPC_URL,
    explorerApiUrl: EXPLORER_API_URL,
    explorerApiKey: EXPLORER_API_KEY,
    block: env.SNAPSHOT_BLOCK ?? "latest",
    assets: [NATIVE_ASSET, ...KNOWN_ERC20S],
    minBalanceWei: env.SNAPSHOT_MIN_BALANCE_WEI ? BigInt(env.SNAPSHOT_MIN_BALANCE_WEI) : 1n,
    includeContracts: env.SNAPSHOT_INCLUDE_CONTRACTS === "true",
    excludedAddresses: excluded,
    pinBalancesAtBlock: env.SNAPSHOT_PIN_AT_BLOCK !== "false",
    requestConcurrency: Number(env.SNAPSHOT_CONCURRENCY ?? 8),
    pageSize: Number(env.SNAPSHOT_PAGE_SIZE ?? 50),
    maxRetries: Number(env.SNAPSHOT_MAX_RETRIES ?? 5),
    ...overrides,
  };
}
