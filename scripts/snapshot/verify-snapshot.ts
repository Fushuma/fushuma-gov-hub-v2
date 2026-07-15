/**
 * Re-verify a generated snapshot directory: for every claim bundle, recompute
 * each leaf, fold every proof exactly as the on-chain distributor does, and
 * confirm the root and totals match the manifest.
 *
 * Usage:
 *   pnpm snapshot:verify -- snapshot-out/<block>
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  verifyClaimBundle,
  type AssetClaimBundle,
  type SnapshotManifest,
} from "../../src/lib/snapshot/index";

function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: snapshot:verify -- <snapshot-dir>");
    process.exit(2);
  }

  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`manifest not found: ${manifestPath}`);
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SnapshotManifest;
  const claimsDir = join(dir, "claims");

  let failures = 0;
  const seenSymbols = new Set<string>();

  for (const file of existsSync(claimsDir) ? readdirSync(claimsDir) : []) {
    if (!file.endsWith(".json")) continue;
    const bundle = JSON.parse(readFileSync(join(claimsDir, file), "utf8")) as AssetClaimBundle;
    seenSymbols.add(bundle.asset.symbol);
    const report = verifyClaimBundle(bundle);

    const manifestEntry = manifest.assets.find((a) => a.symbol === bundle.asset.symbol);
    if (!manifestEntry) {
      console.error(`✗ ${bundle.asset.symbol}: present in claims but missing from manifest`);
      failures++;
    } else if (manifestEntry.merkleRoot !== bundle.merkleRoot) {
      console.error(`✗ ${bundle.asset.symbol}: manifest root != bundle root`);
      failures++;
    }

    if (report.ok) {
      console.log(`✓ ${report.symbol.padEnd(6)} ${report.numClaims} claims, total ${report.checkedTotal}`);
    } else {
      failures++;
      console.error(`✗ ${report.symbol}: ${report.errors.slice(0, 5).join("; ")}${report.errors.length > 5 ? " …" : ""}`);
    }
  }

  // Every manifest asset must have a corresponding verified bundle.
  for (const a of manifest.assets) {
    if (!seenSymbols.has(a.symbol)) {
      console.error(`✗ ${a.symbol}: in manifest but no claims file found`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\nFAILED: ${failures} problem(s) found`);
    process.exit(1);
  }
  console.log(`\nOK: all bundles verified against the manifest`);
}

main();
