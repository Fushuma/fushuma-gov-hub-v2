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

/** Parse an integer env var, falling back to `def` on missing/invalid input. */
function intEnv(name: string, def: number): number {
  const raw = env[name];
  if (raw == null || raw.trim() === "") return def;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export const CHAIN_ID = intEnv("NEXT_PUBLIC_FUSHUMA_CHAIN_ID", intEnv("SNAPSHOT_CHAIN_ID", 121224));

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
 *
 * WARNING: any ERC-20 with real user balances that is NOT listed here is
 * omitted from the migration entirely. Cross-check against the explorer's token
 * list before finalizing.
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
 * Protocol / infrastructure contracts (docs/DEPLOYED_CONTRACTS.md). These are
 * ALWAYS excluded from the airdrop trees, because:
 *   - their balances are either protocol-owned, or user funds held in custody
 *     (veFUMA locks, LP positions, launchpad/bridge/vesting escrow), and
 *   - airdropping to these addresses on the new chain would strand the funds
 *     at a contract that does not exist there.
 *
 * Balances held by these contracts are still recorded and reported (see the
 * `excluded` output of a snapshot) so the migration team can attribute them to
 * the underlying users with dedicated adapters. In particular, including the
 * WFUMA contract here also prevents double-counting wrapped FUMA (its native
 * balance is the backing for the separately-snapshotted WFUMA ERC-20 tree).
 */
export const SYSTEM_CONTRACTS: Record<string, Address> = {
  Vault: "0x9c6bAfE545fF2d31B0abef12F4724DCBfB08c839",
  CLPoolManager: "0x2D691Ff314F7BB2Ce9Aeb94d556440Bb0DdbFe1e",
  BinPoolManager: "0xD5F370971602DB2D449a6518f55fCaFBd1a51143",
  CLPositionManager: "0x750525284ec59F21CF1c03C62A062f6B6473B7b1",
  BinPositionManager: "0x1842651310c3BD344E58CDb84c1B96a386998e04",
  FumaInfinityRouter: "0x662F4e8CdB064B58FE686AFCd2ceDbB921a0f11f",
  MixedQuoter: "0x0Ea2c4B7990EB44f2E9a106b159C165e702dF98d",
  WFUMA: "0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E",
  Permit2: "0x1d5E963f9581F5416Eae6C9978246B7dDf559Ff0",
  LaunchpadProxy: "0x206236eca2dF8FB37EF1d024e1F72f4313f413E4",
  VestingImplementation: "0x0d8e696475b233193d21E565C21080EbF6A3C5DA",
  Bridge: "0x7304ac11BE92A013dA2a8a9D77330eA5C1531462",
  VotingEscrow: "0x80Ebf301efc7b0FF1825dC3B4e8d69e414eaa26f",
  EpochManager: "0x36C3b4EA7dC2622b8C63a200B60daC0ab2d8f453",
  GovernanceCouncil: "0x92bCcdcae7B73A5332429e517D26515D447e9997",
  FushumaGovernor: "0xF36107b3AA203C331284E5A467C1c58bDD5b591D",
  GaugeController: "0x41E7ba36C43CCd4b83a326bB8AEf929e109C9466",
  GrantGauge: "0x0D6833778cf1fa803D21075b800483F68f57A153",
};

/** How to enumerate ERC-20 holders. */
export type TokenHolderSource = "explorer" | "logs";

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
  /** If false, contract-held balances (outside SYSTEM_CONTRACTS) are excluded. */
  includeContracts: boolean;
  /** Addresses to always exclude (burn + system/protocol contracts). */
  excludedAddresses: Set<Address>;
  /** Re-read balances at `block` via RPC instead of trusting explorer values. */
  pinBalancesAtBlock: boolean;
  /**
   * Where the ERC-20 holder SET comes from. "explorer" is fast but reflects
   * current holders; "logs" replays Transfer events up to the block for a
   * historically-complete set (see H2 note in the README).
   */
  tokenHolderSource: TokenHolderSource;
  /** Earliest block to scan for Transfer logs (token deploy block); 0 = genesis. */
  deployBlock: bigint;
  /** Block span per getLogs request when using the log source. */
  logChunkSize: bigint;
  /** Concurrency + paging knobs for the live collector. */
  requestConcurrency: number;
  maxRetries: number;
}

export const BURN_ADDRESSES: Address[] = [
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dEaD",
];

/** The full set of addresses always excluded from the airdrop trees. */
export function defaultExcludedAddresses(): Set<Address> {
  const set = new Set<Address>();
  for (const a of BURN_ADDRESSES) set.add(a.toLowerCase() as Address);
  for (const a of Object.values(SYSTEM_CONTRACTS)) set.add(a.toLowerCase() as Address);
  return set;
}

export function loadConfig(overrides: Partial<SnapshotConfig> = {}): SnapshotConfig {
  return {
    chainId: CHAIN_ID,
    rpcUrl: RPC_URL,
    explorerApiUrl: EXPLORER_API_URL,
    explorerApiKey: EXPLORER_API_KEY,
    block: env.SNAPSHOT_BLOCK ?? "latest",
    assets: [NATIVE_ASSET, ...KNOWN_ERC20S],
    minBalanceWei: env.SNAPSHOT_MIN_BALANCE_WEI ? BigInt(env.SNAPSHOT_MIN_BALANCE_WEI) : 1n,
    includeContracts: env.SNAPSHOT_INCLUDE_CONTRACTS === "true",
    excludedAddresses: defaultExcludedAddresses(),
    pinBalancesAtBlock: env.SNAPSHOT_PIN_AT_BLOCK !== "false",
    tokenHolderSource: env.SNAPSHOT_TOKEN_HOLDER_SOURCE === "logs" ? "logs" : "explorer",
    deployBlock: env.SNAPSHOT_DEPLOY_BLOCK ? BigInt(env.SNAPSHOT_DEPLOY_BLOCK) : 0n,
    logChunkSize: env.SNAPSHOT_LOG_CHUNK ? BigInt(env.SNAPSHOT_LOG_CHUNK) : 50000n,
    requestConcurrency: intEnv("SNAPSHOT_CONCURRENCY", 8),
    maxRetries: intEnv("SNAPSHOT_MAX_RETRIES", 5),
    ...overrides,
  };
}
