#!/usr/bin/env tsx
/**
 * Independent verification of a produced snapshot.
 *
 * A snapshot nobody can check is just a claim. This re-derives everything that
 * can be re-derived from the files on disk, and optionally re-reads the chain:
 *
 *   1. Every file hashes to what manifest.json says, and the rolled-up
 *      snapshotHash still matches - catches truncation, corruption and edits.
 *   2. Merkle roots are rebuilt from the holder files and compared to the
 *      published roots - catches a root that was never derived from this data.
 *   3. With --rpc, a sample of balances is re-read at the freeze block, and the
 *      freeze block hash is confirmed still canonical.
 *
 * Usage:
 *   pnpm snapshot:verify -- --dir snapshots/fushuma-121224-block-1234567
 *   pnpm snapshot:verify -- --dir <dir> --rpc https://rpc.fushuma.com
 */

import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';

import { RpcClient } from './lib/rpc';
import { callBatch, ERC20_ABI } from './lib/abi';
import { buildTree } from '../../src/lib/snapshot/merkle';
import { toQuantity, type Hex } from '../../src/lib/snapshot/hex';
import { chunk } from '../../src/lib/snapshot/ranges';
import type { Manifest } from './steps/manifest';
import type { BlockTag } from './steps/pin';

interface Failure {
  check: string;
  detail: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dir = resolve(argValue(args, 'dir') ?? '.');
  const rpcUrl = argValue(args, 'rpc');
  const sampleSize = Number(argValue(args, 'sample') ?? 100);

  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`No manifest.json in ${dir}. Pass --dir <snapshot directory>.`);
    process.exit(1);
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;

  console.log('Verifying snapshot');
  console.log(`  dir          ${dir}`);
  console.log(`  chain        ${manifest.chainId}`);
  console.log(`  freeze block ${manifest.freezeBlock} (${manifest.freezeBlockHash})`);
  console.log(`  published    ${manifest.snapshotHash}\n`);

  const failures: Failure[] = [];

  // ---- 1. file integrity ------------------------------------------------
  console.log('[1/3] File hashes');
  let checked = 0;

  for (const entry of manifest.files) {
    const path = join(dir, entry.path);
    if (!existsSync(path)) {
      failures.push({ check: 'file present', detail: `${entry.path} is missing` });
      continue;
    }

    const actual = await hashFile(path);
    if (actual !== entry.sha256) {
      failures.push({
        check: 'file hash',
        detail: `${entry.path}: expected ${entry.sha256}, got ${actual}`,
      });
    }
    checked += 1;
  }

  console.log(`  ${checked}/${manifest.files.length} files hashed`);

  // The rollup must be reproducible from the manifest's own file list.
  const rollup = createHash('sha256');
  for (const entry of [...manifest.files].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    rollup.update(`${entry.path}\n${entry.sha256}\n`);
  }
  const recomputed = rollup.digest('hex');

  if (recomputed !== manifest.snapshotHash) {
    failures.push({
      check: 'snapshot hash',
      detail: `manifest says ${manifest.snapshotHash}, recomputed ${recomputed}`,
    });
  } else {
    console.log(`  snapshot hash matches: ${recomputed}`);
  }

  // ---- 2. merkle roots --------------------------------------------------
  console.log('\n[2/3] Merkle roots');
  const tokensDir = join(dir, 'tokens');

  for (const entry of manifest.files) {
    if (!entry.path.startsWith('tokens/') || !entry.path.endsWith('-merkle.json')) continue;

    const published = JSON.parse(await readFile(join(dir, entry.path), 'utf8')) as {
      root: string | null;
      leaves: number;
    };
    if (!published.root) continue;

    const label = entry.path.replace('tokens/', '').replace('-merkle.json', '');
    const holdersPath = join(tokensDir, `${label}-holders.ndjson`);

    if (!existsSync(holdersPath)) {
      failures.push({ check: 'merkle source', detail: `${holdersPath} is missing` });
      continue;
    }

    const holders = await readHolders(holdersPath);
    if (holders.length === 0) {
      failures.push({ check: 'merkle source', detail: `${holdersPath} has no holders` });
      continue;
    }

    const rebuilt = buildTree(holders).root;
    if (rebuilt !== published.root) {
      failures.push({
        check: 'merkle root',
        detail: `${label}: published ${published.root}, rebuilt ${rebuilt}`,
      });
    } else {
      console.log(`  ${label}: ${rebuilt} (${holders.length.toLocaleString()} leaves)`);
    }
  }

  // ---- 3. on-chain spot check -------------------------------------------
  if (!rpcUrl) {
    console.log('\n[3/3] On-chain spot check (skipped - pass --rpc to enable)');
  } else {
    console.log('\n[3/3] On-chain spot check');
    const rpc = new RpcClient({ url: rpcUrl, batchSize: 50, concurrency: 4 });

    // Confirm the freeze block is still the canonical block at that height.
    // If it is not, the snapshot describes an orphaned chain.
    const block = await rpc.call<{ hash: string } | null>('eth_getBlockByNumber', [
      toQuantity(manifest.freezeBlock),
      false,
    ]);

    if (!block) {
      failures.push({
        check: 'freeze block',
        detail: `node has no block at height ${manifest.freezeBlock}`,
      });
    } else if (block.hash.toLowerCase() !== manifest.freezeBlockHash.toLowerCase()) {
      failures.push({
        check: 'freeze block',
        detail:
          `block ${manifest.freezeBlock} is ${block.hash} on this node but the snapshot ` +
          `recorded ${manifest.freezeBlockHash} - the snapshot is off the canonical chain`,
      });
    } else {
      console.log(`  freeze block hash confirmed canonical`);
    }

    const tag: BlockTag = toQuantity(manifest.freezeBlock);

    for (const entry of manifest.files) {
      if (!entry.path.startsWith('tokens/') || !entry.path.endsWith('-merkle.json')) continue;

      const published = JSON.parse(await readFile(join(dir, entry.path), 'utf8')) as {
        token: Hex;
        root: string | null;
      };
      if (!published.root) continue;

      const label = entry.path.replace('tokens/', '').replace('-merkle.json', '');
      const holders = await readHolders(join(tokensDir, `${label}-holders.ndjson`));
      const sample = holders.slice(0, Math.min(sampleSize, holders.length));
      let mismatches = 0;

      for (const page of chunk(sample, 50)) {
        const results = await callBatch<bigint>(
          rpc,
          tag,
          page.map((holder) => ({
            address: published.token,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [holder.address],
          })),
        );

        results.forEach((result, i) => {
          if (!result.ok || result.value !== page[i].amount) {
            mismatches += 1;
            if (mismatches <= 5) {
              failures.push({
                check: 'balance spot check',
                detail: `${label} ${page[i].address}: snapshot ${page[i].amount}, chain ${
                  result.ok ? result.value : result.error.message
                }`,
              });
            }
          }
        });
      }

      console.log(
        `  ${label}: ${sample.length} balances re-read, ${mismatches} mismatch(es)`,
      );
    }
  }

  // ---- verdict ----------------------------------------------------------
  if (failures.length === 0) {
    console.log('\nVERIFIED. Every check passed.');
    console.log(`  snapshot hash ${manifest.snapshotHash}`);
    if (manifest.warnings.length > 0) {
      console.log(
        `\nNote: the export recorded ${manifest.warnings.length} warning(s). Verification ` +
          'confirms the files are intact and self-consistent, not that the export was complete:',
      );
      for (const warning of manifest.warnings) console.log(`  - ${warning}`);
    }
    return;
  }

  console.log(`\nVERIFICATION FAILED - ${failures.length} problem(s):`);
  for (const failure of failures.slice(0, 50)) {
    console.log(`  [${failure.check}] ${failure.detail}`);
  }
  if (failures.length > 50) console.log(`  ... and ${failures.length - 50} more`);
  process.exit(1);
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(path);
  for await (const piece of stream) hash.update(piece as Buffer);
  return hash.digest('hex');
}

async function readHolders(path: string): Promise<Array<{ address: string; amount: bigint }>> {
  const reader = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  const holders: Array<{ address: string; amount: bigint }> = [];
  for await (const line of reader) {
    if (!line.trim()) continue;
    const record = JSON.parse(line) as { address: string; balance: string };
    holders.push({ address: record.address, amount: BigInt(record.balance) });
  }
  return holders;
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index !== -1) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.slice(name.length + 3) : undefined;
}

main().catch((error: unknown) => {
  console.error('Verification error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
