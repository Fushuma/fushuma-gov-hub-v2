/**
 * Build a Fushuma migration snapshot: enumerate holders, pin balances at a
 * block, and emit a Merkle airdrop-claim bundle per asset.
 *
 * Usage:
 *   # Live (requires network access to rpc.fushuma.com + fumascan.com):
 *   pnpm snapshot:build -- --block 1234567 --out snapshot-out
 *
 *   # Historically-complete ERC-20 holder set via Transfer-log replay:
 *   pnpm snapshot:build -- --block 1234567 --token-source logs --deploy-block 0
 *
 *   # Offline dry-run from a fixture (no network):
 *   pnpm snapshot:build -- --fixture scripts/snapshot/fixtures/sample-balances.json --out snapshot-out
 *
 * Flags:
 *   --out <dir>            Output directory (default: ./snapshot-out)
 *   --block <n|latest>     Block to pin balances at (default: env SNAPSHOT_BLOCK or latest)
 *   --fixture <path>       Read raw balances from a fixture instead of the network
 *   --include-contracts    Include (unknown) contract-held balances in the trees
 *   --min-balance <wei>    Drop balances below this many base units (default: 1)
 *   --no-pin               Trust explorer balances instead of re-reading at the block
 *   --token-source <s>     ERC-20 holder source: "explorer" (default) or "logs"
 *   --deploy-block <n>     Earliest block for --token-source logs (default: 0)
 *   --holders <path>       Supplemental holder addresses (JSON array or newline list)
 *
 * Outputs (under <out>/<block>/):
 *   manifest.json                 roots + totals + excluded summary
 *   balances/<SYMBOL>.json        normalized holder balances
 *   claims/<SYMBOL>.json          Merkle root + per-address proof for claiming
 *   excluded/<SYMBOL>.json        everything left out (burn/system/contract/dust) + why
 */

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getAddress, isAddress } from "viem";
import {
  loadConfig,
  collectAll,
  buildSnapshot,
  verifyClaimBundle,
  type AssetBalances,
  type SnapshotConfig,
  type Address,
} from "../../src/lib/snapshot/index";

interface Args {
  out: string;
  block?: string;
  fixture?: string;
  includeContracts: boolean;
  minBalance?: string;
  noPin: boolean;
  tokenSource?: "explorer" | "logs";
  deployBlock?: string;
  holders?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { out: "snapshot-out", includeContracts: false, noPin: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--out": args.out = argv[++i]; break;
      case "--block": args.block = argv[++i]; break;
      case "--fixture": args.fixture = argv[++i]; break;
      case "--include-contracts": args.includeContracts = true; break;
      case "--min-balance": args.minBalance = argv[++i]; break;
      case "--no-pin": args.noPin = true; break;
      case "--token-source": {
        const v = argv[++i];
        if (v !== "explorer" && v !== "logs") throw new Error(`--token-source must be explorer|logs`);
        args.tokenSource = v;
        break;
      }
      case "--deploy-block": args.deployBlock = argv[++i]; break;
      case "--holders": args.holders = argv[++i]; break;
      default:
        if (a.startsWith("--")) throw new Error(`unknown flag: ${a}`);
    }
  }
  return args;
}

/** Load raw balances from a fixture file for offline dry-runs. */
function loadFixture(path: string): { block: string; rawByAsset: AssetBalances[] } {
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    block?: string;
    chainId?: number;
    assets: Array<{
      asset: AssetBalances["asset"];
      entries: Array<{ address: Address; balance: string; isContract?: boolean }>;
    }>;
  };
  const block = raw.block ?? "fixture";
  const chainId = raw.chainId ?? 121224;
  return {
    block,
    rawByAsset: raw.assets.map((a) => ({
      asset: a.asset,
      chainId,
      block,
      entries: a.entries.map((e) => ({
        address: e.address,
        balance: BigInt(e.balance),
        isContract: e.isContract,
      })),
    })),
  };
}

/** Parse a supplemental holders file (JSON array of addresses or newline list). */
function loadHolders(path: string): Address[] {
  const text = readFileSync(path, "utf8").trim();
  const raw: string[] = text.startsWith("[")
    ? (JSON.parse(text) as string[])
    : text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Address[] = [];
  for (const a of raw) {
    if (isAddress(a)) out.push(getAddress(a));
    else console.warn(`  skipping invalid holder address: ${a}`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const overrides: Partial<SnapshotConfig> = { includeContracts: args.includeContracts };
  if (args.block) overrides.block = args.block;
  if (args.minBalance) overrides.minBalanceWei = BigInt(args.minBalance);
  if (args.noPin) overrides.pinBalancesAtBlock = false;
  if (args.tokenSource) overrides.tokenHolderSource = args.tokenSource;
  if (args.deployBlock) overrides.deployBlock = BigInt(args.deployBlock);
  const cfg = loadConfig(overrides);

  const log = (msg: string) => console.log(msg);

  // M5 guard: pinning off + an explicit historical block would mislabel current
  // balances as historical. Refuse rather than write a misleading snapshot.
  if (!args.fixture && !cfg.pinBalancesAtBlock && cfg.block !== "latest") {
    throw new Error(
      `--no-pin with --block ${cfg.block} would label current balances as block ${cfg.block}. ` +
        `Either drop --no-pin (read balances at the block) or use --block latest.`,
    );
  }

  let collected: { block: string; rawByAsset: AssetBalances[] };
  if (args.fixture) {
    log(`Loading fixture ${args.fixture} (offline mode)`);
    collected = loadFixture(args.fixture);
    cfg.block = collected.block;
    cfg.pinBalancesAtBlock = false;
  } else {
    const extraHolders = args.holders ? loadHolders(args.holders) : undefined;
    if (extraHolders?.length) log(`Loaded ${extraHolders.length} supplemental holder(s)`);
    log(`Collecting live from ${cfg.explorerApiUrl} / ${cfg.rpcUrl}`);
    collected = await collectAll(cfg, { log, extraHolders });
    cfg.block = collected.block;
  }

  const snapshot = buildSnapshot(collected.rawByAsset, cfg, new Date().toISOString());

  const outDir = join(args.out, String(snapshot.manifest.block));
  mkdirSync(join(outDir, "balances"), { recursive: true });
  mkdirSync(join(outDir, "claims"), { recursive: true });
  mkdirSync(join(outDir, "excluded"), { recursive: true });

  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(snapshot.manifest, null, 2));

  let totalClaims = 0;
  for (const asset of snapshot.assets) {
    const sym = asset.balances.asset.symbol;
    writeFileSync(join(outDir, "balances", `${sym}.json`), JSON.stringify(asset.balances, null, 2));
    writeFileSync(join(outDir, "excluded", `${sym}.json`), JSON.stringify(asset.excluded, null, 2));
    if (asset.bundle) {
      const report = verifyClaimBundle(asset.bundle);
      if (!report.ok) {
        throw new Error(`self-verification failed for ${sym}: ${report.errors.join("; ")}`);
      }
      writeFileSync(join(outDir, "claims", `${sym}.json`), JSON.stringify(asset.bundle, null, 2));
      totalClaims += asset.bundle.numClaims;
      log(
        `  ${sym.padEnd(6)} root=${asset.bundle.merkleRoot} claims=${asset.bundle.numClaims} total=${asset.bundle.tokenTotal}`,
      );
    } else {
      log(`  ${sym.padEnd(6)} (no eligible holders)`);
    }
  }

  // Surface excluded value loudly — this is where custodied user funds (veFUMA
  // locks, LP positions, vesting) show up and need deliberate attribution.
  if (snapshot.manifest.excluded.length) {
    log(`\nExcluded from airdrop (see excluded/*.json):`);
    for (const ex of snapshot.manifest.excluded) {
      const reasons = Object.entries(ex.byReason)
        .map(([r, v]) => `${r}=${v.count}`)
        .join(", ");
      log(`  ${ex.symbol.padEnd(6)} ${ex.excludedCount} addr, total ${ex.totalExcluded} (${reasons})`);
    }
  }

  log(`\nSnapshot written to ${outDir}`);
  log(`Block: ${snapshot.manifest.block}  Assets: ${snapshot.manifest.assets.length}  Claims: ${totalClaims}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
