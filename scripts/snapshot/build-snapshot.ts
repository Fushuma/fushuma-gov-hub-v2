/**
 * Build a Fushuma migration snapshot: enumerate holders, pin balances at a
 * block, and emit a Merkle airdrop-claim bundle per asset.
 *
 * Usage:
 *   # Live (requires network access to rpc.fushuma.com + fumascan.com):
 *   pnpm snapshot:build -- --block 1234567 --out snapshot-out
 *
 *   # Offline dry-run from a fixture (no network):
 *   pnpm snapshot:build -- --fixture scripts/snapshot/fixtures/sample-balances.json --out snapshot-out
 *
 * Flags:
 *   --out <dir>            Output directory (default: ./snapshot-out)
 *   --block <n|latest>     Block to pin balances at (default: env SNAPSHOT_BLOCK or latest)
 *   --fixture <path>       Read raw balances from a fixture instead of the network
 *   --include-contracts    Include contract-held balances in the claim trees
 *   --min-balance <wei>    Drop balances below this many base units (default: 1)
 *   --no-pin               Trust explorer balances instead of re-reading at the block
 *
 * Outputs (under <out>/<block>/):
 *   manifest.json                 roots + totals for every asset
 *   balances/<SYMBOL>.json        normalized holder balances
 *   claims/<SYMBOL>.json          Merkle root + per-address proof for claiming
 */

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadConfig,
  collectAll,
  buildSnapshot,
  verifyClaimBundle,
  type AssetBalances,
  type SnapshotConfig,
} from "../../src/lib/snapshot/index";

interface Args {
  out: string;
  block?: string;
  fixture?: string;
  includeContracts: boolean;
  minBalance?: string;
  noPin: boolean;
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
      entries: Array<{ address: `0x${string}`; balance: string; isContract?: boolean }>;
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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const overrides: Partial<SnapshotConfig> = { includeContracts: args.includeContracts };
  if (args.block) overrides.block = args.block;
  if (args.minBalance) overrides.minBalanceWei = BigInt(args.minBalance);
  if (args.noPin) overrides.pinBalancesAtBlock = false;
  const cfg = loadConfig(overrides);

  const log = (msg: string) => console.log(msg);

  let collected: { block: string; rawByAsset: AssetBalances[] };
  if (args.fixture) {
    log(`Loading fixture ${args.fixture} (offline mode)`);
    collected = loadFixture(args.fixture);
    cfg.block = collected.block;
    cfg.pinBalancesAtBlock = false;
  } else {
    log(`Collecting live from ${cfg.explorerApiUrl} / ${cfg.rpcUrl}`);
    collected = await collectAll(cfg, { log });
    cfg.block = collected.block;
  }

  const snapshot = buildSnapshot(collected.rawByAsset, cfg, new Date().toISOString());

  const outDir = join(args.out, String(snapshot.manifest.block));
  mkdirSync(join(outDir, "balances"), { recursive: true });
  mkdirSync(join(outDir, "claims"), { recursive: true });

  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(snapshot.manifest, null, 2));

  let totalClaims = 0;
  for (const asset of snapshot.assets) {
    const sym = asset.balances.asset.symbol;
    writeFileSync(join(outDir, "balances", `${sym}.json`), JSON.stringify(asset.balances, null, 2));
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

  log(`\nSnapshot written to ${outDir}`);
  log(`Block: ${snapshot.manifest.block}  Assets: ${snapshot.manifest.assets.length}  Claims: ${totalClaims}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
