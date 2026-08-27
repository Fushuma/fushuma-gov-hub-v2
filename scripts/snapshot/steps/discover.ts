/**
 * Address discovery for nodes without the debug namespace.
 *
 * An EVM node cannot enumerate accounts over RPC - the state trie is not
 * exposed that way. When the full state dump is unavailable, the only way to
 * learn who exists is to replay history and collect every address the chain
 * ever mentioned.
 *
 * Two passes, because neither alone is complete:
 *   - Block scan: senders, recipients, block producers, and contract creations.
 *   - Log scan:   log emitters and address-shaped indexed topics, which is how
 *                 accounts touched only by an internal call become visible.
 *
 * KNOWN GAP: an address that only ever received value through an internal
 * transfer and never emitted or indexed an event is invisible to both passes.
 * Recovering those needs trace_block or debug_traceBlockByNumber, or the full
 * state dump. This is reported in the summary rather than glossed over - if
 * the number matters to you, run the export against a debug-enabled node.
 *
 * The scan is resumable: it checkpoints after every range, so an interrupted
 * multi-hour run picks up where it stopped instead of starting over.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';

import { NdjsonWriter, Progress, type FileDigest } from '../lib/out';
import { RpcClient, type RpcRequest } from '../lib/rpc';
import type { SnapshotConfig } from '../lib/config';
import type { PinnedBlock } from './pin';
import {
  isAddress,
  normalizeAddress,
  toQuantity,
  ZERO_ADDRESS,
  type Hex,
} from '../../../src/lib/snapshot/hex';
import { bisectRange, chunk, splitBlockRange, type BlockRange } from '../../../src/lib/snapshot/ranges';

interface RpcTransaction {
  hash: string;
  from: string;
  to: string | null;
}

interface RpcBlockWithTxs {
  number: string;
  miner?: string;
  transactions: RpcTransaction[];
}

interface RpcLog {
  address: string;
  topics: string[];
}

interface Checkpoint {
  blocksScannedThrough: number | null;
  logsScannedThrough: number | null;
  freezeBlock: number;
}

export interface DiscoverySummary {
  addresses: number;
  blocksScanned: number;
  contractCreations: number;
  logsSeen: number;
  files: FileDigest[];
  /** Reminder that internal-only recipients may be absent. */
  completeness: string;
}

export async function discoverAddresses(
  rpc: RpcClient,
  config: SnapshotConfig,
  pinned: PinnedBlock,
  outDir: string,
  seeds: readonly Hex[] = [],
): Promise<{ addresses: Hex[]; summary: DiscoverySummary }> {
  const addressPath = join(outDir, 'discovery', 'addresses.ndjson');
  const checkpointPath = join(outDir, 'discovery', 'checkpoint.json');

  const checkpoint = await loadCheckpoint(checkpointPath, pinned.number);
  const known = new Set<Hex>();

  if (existsSync(addressPath) && checkpoint.blocksScannedThrough !== null) {
    await loadKnownAddresses(addressPath, known);
    console.log(
      `  resuming discovery: ${known.size.toLocaleString()} addresses already on disk, ` +
        `blocks scanned through ${checkpoint.blocksScannedThrough.toLocaleString()}`,
    );
  }

  const resuming = checkpoint.blocksScannedThrough !== null;
  const writer = await NdjsonWriter.create(addressPath, { append: resuming });

  const record = async (raw: string | null | undefined, source: string): Promise<void> => {
    if (!raw || !isAddress(raw)) return;
    const address = normalizeAddress(raw);
    if (address === ZERO_ADDRESS) return;
    if (known.has(address)) return;
    known.add(address);
    await writer.write({ address, firstSeenVia: source });
  };

  for (const seed of seeds) {
    await record(seed, 'registry');
  }

  const blockStart = (checkpoint.blocksScannedThrough ?? -1) + 1;
  let contractCreations = 0;
  let blocksScanned = 0;

  if (blockStart <= pinned.number) {
    const progress = new Progress('discover:blocks', pinned.number - blockStart + 1);

    for (const range of splitBlockRange(blockStart, pinned.number, config.batchSize)) {
      const requests: RpcRequest[] = [];
      for (let n = range.from; n <= range.to; n += 1) {
        requests.push({ method: 'eth_getBlockByNumber', params: [toQuantity(n), true] });
      }

      const results = await rpc.batch<RpcBlockWithTxs | null>(requests);
      const creationTxs: string[] = [];

      for (const result of results) {
        if (!result.ok || !result.value) continue;
        const block = result.value;

        await record(block.miner, 'coinbase');

        for (const tx of block.transactions ?? []) {
          await record(tx.from, 'tx-sender');
          if (tx.to === null || tx.to === undefined) {
            creationTxs.push(tx.hash);
          } else {
            await record(tx.to, 'tx-recipient');
          }
        }
      }

      // Contract creations only reveal the deployed address in the receipt.
      for (const batch of chunk(creationTxs, config.batchSize)) {
        const receipts = await rpc.batch<{ contractAddress: string | null } | null>(
          batch.map((hash) => ({ method: 'eth_getTransactionReceipt', params: [hash] })),
        );
        for (const receipt of receipts) {
          if (receipt.ok && receipt.value?.contractAddress) {
            await record(receipt.value.contractAddress, 'contract-creation');
            contractCreations += 1;
          }
        }
      }

      blocksScanned += range.to - range.from + 1;
      progress.advance(range.to - range.from + 1);
      checkpoint.blocksScannedThrough = range.to;
      await saveCheckpoint(checkpointPath, checkpoint);
    }

    progress.finish();
  }

  const logStart = (checkpoint.logsScannedThrough ?? -1) + 1;
  let logsSeen = 0;

  if (logStart <= pinned.number) {
    const progress = new Progress('discover:logs', pinned.number - logStart + 1);

    for (const range of splitBlockRange(logStart, pinned.number, config.logRange)) {
      const logs = await fetchLogsAdaptive(rpc, range);
      logsSeen += logs.length;

      for (const log of logs) {
        await record(log.address, 'log-emitter');
        // Indexed address arguments arrive as 32-byte left-padded topics.
        for (const topic of log.topics.slice(1)) {
          if (typeof topic === 'string' && topic.length === 66 && /^0x0{24}/.test(topic)) {
            await record(`0x${topic.slice(26)}`, 'log-topic');
          }
        }
      }

      progress.advance(range.to - range.from + 1);
      checkpoint.logsScannedThrough = range.to;
      await saveCheckpoint(checkpointPath, checkpoint);
    }

    progress.finish();
  }

  const file = await writer.close();

  const addresses = [...known].sort();
  console.log(`  discovered ${addresses.length.toLocaleString()} distinct addresses`);

  return {
    addresses,
    summary: {
      addresses: addresses.length,
      blocksScanned,
      contractCreations,
      logsSeen,
      files: [file],
      completeness:
        'Addresses that only ever received value via an internal call, and never emitted ' +
        'or were indexed in an event, are not discoverable over standard RPC. Use a ' +
        'debug-enabled node for a provably complete account set.',
    },
  };
}

/**
 * eth_getLogs with adaptive range splitting. Every provider caps the span or
 * the result count differently, and the cap is usually reported as a plain
 * error, so the range is halved until it fits.
 */
export async function fetchLogsAdaptive(
  rpc: RpcClient,
  range: BlockRange,
  filter: { address?: Hex | Hex[]; topics?: Array<string | string[] | null> } = {},
): Promise<RpcLog[]> {
  const [result] = await rpc.batch<RpcLog[]>([
    {
      method: 'eth_getLogs',
      params: [
        {
          fromBlock: toQuantity(range.from),
          toBlock: toQuantity(range.to),
          ...(filter.address ? { address: filter.address } : {}),
          ...(filter.topics ? { topics: filter.topics } : {}),
        },
      ],
    },
  ]);

  if (result.ok) return result.value ?? [];

  const halves = bisectRange(range);
  if (!halves) {
    throw new Error(
      `eth_getLogs failed for single block ${range.from}: ${result.error.message}`,
    );
  }

  const [left, right] = halves;
  return [
    ...(await fetchLogsAdaptive(rpc, left, filter)),
    ...(await fetchLogsAdaptive(rpc, right, filter)),
  ];
}

async function loadCheckpoint(path: string, freezeBlock: number): Promise<Checkpoint> {
  if (!existsSync(path)) {
    return { blocksScannedThrough: null, logsScannedThrough: null, freezeBlock };
  }

  const parsed = JSON.parse(await readFile(path, 'utf8')) as Checkpoint;

  // A checkpoint from a different freeze block describes a different snapshot.
  // Resuming across it would mix two heights, so start clean instead.
  if (parsed.freezeBlock !== freezeBlock) {
    console.warn(
      `  ignoring checkpoint for block ${parsed.freezeBlock} - this run freezes at ${freezeBlock}`,
    );
    return { blocksScannedThrough: null, logsScannedThrough: null, freezeBlock };
  }

  return parsed;
}

async function saveCheckpoint(path: string, checkpoint: Checkpoint): Promise<void> {
  await writeFile(path, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
}

async function loadKnownAddresses(path: string, into: Set<Hex>): Promise<void> {
  const reader = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of reader) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as { address?: string };
      if (parsed.address && isAddress(parsed.address)) {
        into.add(normalizeAddress(parsed.address));
      }
    } catch {
      // A partial final line from an interrupted run - the scan re-covers that
      // range anyway, so skipping it loses nothing.
    }
  }
}
