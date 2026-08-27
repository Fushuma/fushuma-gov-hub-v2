#!/usr/bin/env tsx
/**
 * Preflight: can this RPC endpoint produce a usable hard-fork snapshot?
 *
 * Run this BEFORE the fork window. It answers, in one pass, the questions that
 * otherwise surface three hours into an export:
 *   - is this actually Fushuma, and is the node synced?
 *   - can it serve historical state, or only the last 128 blocks?
 *   - is the debug namespace available, and were preimages kept?
 *   - how large an eth_getLogs range and JSON-RPC batch will it accept?
 *
 * Exits non-zero if anything blocks a snapshot, so it can gate a release step.
 */

import { loadConfig } from './lib/config';
import { RpcClient } from './lib/rpc';
import { formatDuration } from './lib/out';
import { TRACKED_CONTRACTS } from './lib/registry';
import { hexToNumber, toQuantity } from '../../src/lib/snapshot/hex';

type Level = 'ok' | 'warn' | 'fail';

interface Check {
  name: string;
  level: Level;
  detail: string;
  /** What to do about it, when it is not ok. */
  remedy?: string;
}

const ZERO_HASH = `0x${'0'.repeat(64)}`;

async function main(): Promise<void> {
  const config = loadConfig();
  const rpc = new RpcClient({
    url: config.rpcUrl,
    batchSize: config.batchSize,
    concurrency: config.concurrency,
    timeoutMs: config.timeoutMs,
    maxRetries: 2,
    headers: config.headers,
  });

  console.log('Fushuma snapshot preflight');
  console.log(`  rpc   ${config.rpcUrl}`);
  console.log(`  chain ${config.chainId}\n`);

  const checks: Check[] = [];
  const started = Date.now();

  // ---- identity and liveness -------------------------------------------
  let head = 0;

  try {
    const chainId = hexToNumber(await rpc.call<string>('eth_chainId'));
    checks.push(
      chainId === config.chainId
        ? { name: 'chain id', level: 'ok', detail: String(chainId) }
        : {
            name: 'chain id',
            level: 'fail',
            detail: `node reports ${chainId}, expected ${config.chainId}`,
            remedy: 'Point --rpc at a Fushuma node, or pass --chain-id.',
          },
    );
  } catch (error) {
    checks.push({
      name: 'chain id',
      level: 'fail',
      detail: message(error),
      remedy: 'The endpoint is unreachable. Check the URL, firewall and any auth headers.',
    });
    report(checks, started);
    process.exit(1);
  }

  try {
    const client = await rpc.call<string>('web3_clientVersion');
    checks.push({ name: 'client', level: 'ok', detail: client });
  } catch {
    checks.push({
      name: 'client',
      level: 'warn',
      detail: 'web3_clientVersion unavailable',
      remedy: 'Not fatal, but the node type could not be identified.',
    });
  }

  try {
    head = hexToNumber(await rpc.call<string>('eth_blockNumber'));
    checks.push({ name: 'chain head', level: 'ok', detail: head.toLocaleString() });
  } catch (error) {
    checks.push({ name: 'chain head', level: 'fail', detail: message(error) });
  }

  try {
    const syncing = await rpc.call<false | Record<string, string>>('eth_syncing');
    checks.push(
      syncing === false
        ? { name: 'sync status', level: 'ok', detail: 'fully synced' }
        : {
            name: 'sync status',
            level: 'fail',
            detail: `still syncing: ${JSON.stringify(syncing)}`,
            remedy: 'Wait for the node to finish syncing. A snapshot from a syncing node is incomplete.',
          },
    );
  } catch {
    checks.push({ name: 'sync status', level: 'warn', detail: 'eth_syncing unavailable' });
  }

  // ---- historical state ------------------------------------------------
  // A pruned node answers for recent blocks only. The freeze block sits behind
  // the head by the confirmation depth, so that window has to be readable.
  const probeBlock = Math.max(0, head - config.confirmations);
  try {
    await rpc.call<string>('eth_getBalance', [
      TRACKED_CONTRACTS[0].address,
      toQuantity(probeBlock),
    ]);
    checks.push({
      name: 'state at freeze depth',
      level: 'ok',
      detail: `readable at block ${probeBlock.toLocaleString()} (head - ${config.confirmations})`,
    });
  } catch (error) {
    checks.push({
      name: 'state at freeze depth',
      level: 'fail',
      detail: message(error),
      remedy:
        'The node cannot serve state at the freeze depth. Use an archive node, or lower ' +
        '--confirmations (never below ~32 on a live chain).',
    });
  }

  // Archive access is what lets the export be re-run and audited afterwards.
  const deepBlock = Math.max(0, head - 100_000);
  try {
    await rpc.call<string>('eth_getBalance', [TRACKED_CONTRACTS[0].address, toQuantity(deepBlock)]);
    checks.push({
      name: 'archive state',
      level: 'ok',
      detail: `state readable ${(head - deepBlock).toLocaleString()} blocks back`,
    });
  } catch {
    checks.push({
      name: 'archive state',
      level: 'warn',
      detail: `state at block ${deepBlock.toLocaleString()} is pruned`,
      remedy:
        'Not required for the snapshot itself, but an archive node lets the export be ' +
        're-run and independently audited after the fork.',
    });
  }

  // ---- EIP-1898 --------------------------------------------------------
  try {
    const block = await rpc.call<{ hash: string }>('eth_getBlockByNumber', [
      toQuantity(probeBlock),
      false,
    ]);
    await rpc.call<string>('eth_getBalance', [
      TRACKED_CONTRACTS[0].address,
      { blockHash: block.hash, requireCanonical: true },
    ]);
    checks.push({
      name: 'EIP-1898 block-hash reads',
      level: 'ok',
      detail: 'supported - reads are reorg-proof',
    });
  } catch {
    checks.push({
      name: 'EIP-1898 block-hash reads',
      level: 'warn',
      detail: 'not supported - reads are pinned by block number instead',
      remedy:
        'The export still re-checks the block hash before and after, so a reorg is detected, ' +
        'not ignored.',
    });
  }

  // ---- debug namespace -------------------------------------------------
  let debugAvailable = false;

  try {
    const dump = await rpc.call<{ accounts?: Record<string, unknown>; next?: string }>(
      'debug_accountRange',
      [toQuantity(probeBlock), ZERO_HASH, 2, true, true, true],
    );
    debugAvailable = true;

    const accounts = Object.entries(dump.accounts ?? {});
    // A key that is a 42-char address means the node kept preimages; a 66-char
    // hash means it did not, and the dump cannot become a genesis alloc.
    const hasPreimages = accounts.some(
      ([key, value]) =>
        key.length === 42 ||
        (typeof value === 'object' && value !== null && 'address' in value),
    );

    checks.push({
      name: 'debug_accountRange',
      level: 'ok',
      detail: 'available - full state dump possible',
    });

    checks.push(
      hasPreimages
        ? { name: 'address preimages', level: 'ok', detail: 'plaintext addresses returned' }
        : {
            name: 'address preimages',
            level: 'warn',
            detail: 'accounts come back as hashes only',
            remedy:
              'Re-sync the export node with --cache.preimages. Without preimages the dump ' +
              'records balances but cannot seed a re-launch genesis.',
          },
    );
  } catch {
    checks.push({
      name: 'debug_accountRange',
      level: 'warn',
      detail: 'unavailable',
      remedy:
        'Start the export node with --http.api eth,net,web3,debug. Without it the snapshot ' +
        'falls back to log replay: balances yes, contract storage no.',
    });
  }

  if (debugAvailable) {
    try {
      await rpc.call('debug_storageRangeAt', [
        (await rpc.call<{ hash: string }>('eth_getBlockByNumber', [toQuantity(probeBlock), false]))
          .hash,
        0,
        TRACKED_CONTRACTS[0].address,
        ZERO_HASH,
        1,
      ]);
      checks.push({
        name: 'debug_storageRangeAt',
        level: 'ok',
        detail: 'available - contract storage can be dumped',
      });
    } catch (error) {
      checks.push({
        name: 'debug_storageRangeAt',
        level: 'warn',
        detail: message(error),
        remedy: 'Contract storage cannot be exported without it.',
      });
    }
  }

  // ---- throughput limits ------------------------------------------------
  const logRange = await probeLogRange(rpc, head);
  checks.push(
    logRange >= 1_000
      ? { name: 'eth_getLogs range', level: 'ok', detail: `at least ${logRange.toLocaleString()} blocks` }
      : {
          name: 'eth_getLogs range',
          level: 'warn',
          detail: `capped near ${logRange.toLocaleString()} blocks`,
          remedy: `Pass --log-range ${Math.max(100, logRange)} so scans do not retry constantly.`,
        },
  );

  try {
    const batch = await rpc.batch<string>(
      Array.from({ length: 20 }, () => ({ method: 'eth_blockNumber', params: [] })),
    );
    const okCount = batch.filter((entry) => entry.ok).length;
    checks.push(
      okCount === 20
        ? { name: 'JSON-RPC batching', level: 'ok', detail: '20/20 in one batch' }
        : {
            name: 'JSON-RPC batching',
            level: 'warn',
            detail: `${okCount}/20 succeeded`,
            remedy: 'Lower --batch-size. The export will be slower but correct.',
          },
    );
  } catch (error) {
    checks.push({
      name: 'JSON-RPC batching',
      level: 'warn',
      detail: message(error),
      remedy: 'Run with --batch-size 1 if batching is unsupported.',
    });
  }

  // ---- contract reachability -------------------------------------------
  const codeResults = await rpc.batch<string>(
    TRACKED_CONTRACTS.map((contract) => ({
      method: 'eth_getCode',
      params: [contract.address, toQuantity(probeBlock)],
    })),
  );

  const missing = TRACKED_CONTRACTS.filter((contract, i) => {
    const result = codeResults[i];
    return !result.ok || !result.value || result.value === '0x';
  });

  checks.push(
    missing.length === 0
      ? {
          name: 'tracked contracts',
          level: 'ok',
          detail: `all ${TRACKED_CONTRACTS.length} have code at the freeze depth`,
        }
      : {
          name: 'tracked contracts',
          level: 'warn',
          detail: `${missing.length} of ${TRACKED_CONTRACTS.length} have no code: ${missing
            .map((contract) => contract.label)
            .join(', ')}`,
          remedy:
            'Check scripts/snapshot/lib/registry.ts against docs/DEPLOYED_CONTRACTS.md. A ' +
            'contract with no code is either not deployed yet or listed at a stale address.',
        },
  );

  report(checks, started);

  const failures = checks.filter((check) => check.level === 'fail');
  if (failures.length > 0) {
    console.log('\nPreflight FAILED. Resolve the items above before the fork window.');
    process.exit(1);
  }

  const warnings = checks.filter((check) => check.level === 'warn');
  console.log(
    warnings.length > 0
      ? `\nPreflight passed with ${warnings.length} warning(s). A snapshot will run; read the ` +
          'remedies to know what it will and will not contain.'
      : '\nPreflight passed cleanly. Ready to snapshot.',
  );
  console.log('\nNext:');
  console.log('  pnpm snapshot -- --steps pin        # pin a block, write nothing else');
  console.log('  pnpm snapshot -- --block <N>        # the real export');
}

/** Find the largest eth_getLogs span the node accepts, by halving from 10k. */
async function probeLogRange(rpc: RpcClient, head: number): Promise<number> {
  for (const span of [10_000, 5_000, 2_000, 1_000, 500, 100]) {
    const from = Math.max(0, head - span);
    const [result] = await rpc.batch<unknown[]>([
      {
        method: 'eth_getLogs',
        params: [{ fromBlock: toQuantity(from), toBlock: toQuantity(head) }],
      },
    ]);
    if (result.ok) return span;
  }
  return 50;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function report(checks: Check[], started: number): void {
  const icon: Record<Level, string> = { ok: ' OK ', warn: 'WARN', fail: 'FAIL' };
  const width = Math.max(...checks.map((check) => check.name.length));

  for (const check of checks) {
    console.log(`[${icon[check.level]}] ${check.name.padEnd(width)}  ${check.detail}`);
    if (check.remedy) console.log(`${' '.repeat(width + 9)}-> ${check.remedy}`);
  }

  console.log(`\nChecked in ${formatDuration(Date.now() - started)}`);
}

main().catch((error: unknown) => {
  console.error('Preflight error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
