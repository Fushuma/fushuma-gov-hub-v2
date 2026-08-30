#!/usr/bin/env tsx
/**
 * In-flight inbound bridge transfers: what Fushuma still owes at the freeze block.
 *
 * A user deposits on Ethereum, and the tokens appear on Fushuma only when they
 * (or a relayer) claim there. Between those two moments the transfer exists
 * ONLY as a log on the foreign chain. Fork Fushuma in that window without
 * accounting for it and the deposit is stranded: the foreign bridge has taken
 * the funds and the new Fushuma chain has no record that anything is owed.
 *
 * This tool finds exactly those transfers. For each foreign chain it replays
 * Deposit and BridgeToContract logs addressed to Fushuma, and subtracts the
 * claims the snapshot already recorded on the Fushuma side. What is left is
 * the liability list.
 *
 * Matching rule: a Fushuma Claim's `txId` is the transaction hash of the
 * originating deposit on the source chain. The tool reports the match rate, so
 * if that does not hold for this deployment it is immediately visible as a
 * near-zero rate rather than a silently wrong answer.
 *
 * Usage:
 *   pnpm snapshot:bridge-inbound -- \
 *     --dir snapshots/fushuma-121224-block-<N> \
 *     --chains bridge-chains.json
 *
 * bridge-chains.json:
 *   {
 *     "1":     { "rpc": "https://...", "fromBlock": 18000000 },
 *     "56":    { "rpc": "https://...", "fromBlock": 30000000 },
 *     "137":   { "rpc": "https://...", "fromBlock": 50000000 }
 *   }
 *
 * fromBlock should be the bridge's deployment block on that chain. Omitting it
 * scans from genesis, which on Ethereum is hours of pointless requests.
 */

import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';
import { decodeEventLog, encodeEventTopics, type Abi } from 'viem';

import { RpcClient } from './lib/rpc';
import { NdjsonWriter, Progress, writeJsonFile } from './lib/out';
import { bridgeAddressFor, FOREIGN_BRIDGE_CHAIN_IDS } from './lib/registry';
import { fetchLogsAdaptive } from './steps/discover';
import { formatUnits } from './steps/accounts';
import { hexToNumber, normalizeAddress, type Hex } from '../../src/lib/snapshot/hex';
import { splitBlockRange } from '../../src/lib/snapshot/ranges';
import type { Manifest } from './steps/manifest';
import BridgeAbiJson from '../../src/lib/bridge/abis/bridge.json';

const BRIDGE_ABI = BridgeAbiJson as Abi;
const FUSHUMA_CHAIN_ID = 121224;

interface ChainConfig {
  rpc: string;
  fromBlock?: number;
  toBlock?: number;
  logRange?: number;
  batchSize?: number;
}

interface InFlight {
  sourceChainId: number;
  depositTxHash: string;
  block: number | null;
  receiver: string;
  token: string;
  originalToken: string;
  originalChainID: string;
  value: string;
  toContract: string | null;
  kind: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dir = resolve(argValue(args, 'dir') ?? '.');
  const chainsPath = argValue(args, 'chains');

  if (!chainsPath) {
    console.error('Pass --chains <file.json>. See the header of this file for the format.');
    process.exit(1);
  }

  const manifestPath = join(dir, 'manifest.json');
  const claimsPath = join(dir, 'bridge', 'processed-claims.ndjson');

  if (!existsSync(claimsPath)) {
    console.error(
      `No ${claimsPath}.\n` +
        'Run the snapshot with the bridge step first: pnpm snapshot -- --block <N>',
    );
    process.exit(1);
  }

  const manifest = existsSync(manifestPath)
    ? (JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest)
    : null;

  const chains = JSON.parse(await readFile(resolve(chainsPath), 'utf8')) as Record<
    string,
    ChainConfig
  >;

  console.log('Bridge inbound reconciliation');
  console.log(`  snapshot     ${dir}`);
  if (manifest) {
    console.log(`  freeze block ${manifest.freezeBlock} (${manifest.freezeTimestamp})`);
  }

  // ---- what Fushuma already processed ------------------------------------
  // Keyed by txId alone as well as by (chain, txId): a deposit hash is unique
  // in practice, and matching on it alone catches a claim recorded under an
  // unexpected fromChainId rather than reporting it as unclaimed.
  const claimedByPair = new Set<string>();
  const claimedByTxId = new Set<string>();

  const reader = createInterface({
    input: createReadStream(claimsPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of reader) {
    if (!line.trim()) continue;
    const record = JSON.parse(line) as { fromChainId: number; txId: string };
    const txId = record.txId.toLowerCase();
    claimedByPair.add(`${record.fromChainId}:${txId}`);
    claimedByTxId.add(txId);
  }

  console.log(`  claims known ${claimedByPair.size.toLocaleString()}`);

  const depositTopics = [
    encodeEventTopics({ abi: BRIDGE_ABI, eventName: 'Deposit' })[0],
    encodeEventTopics({ abi: BRIDGE_ABI, eventName: 'BridgeToContract' })[0],
  ] as Hex[];

  const writer = await NdjsonWriter.create(join(dir, 'bridge', 'inbound-unclaimed.ndjson'));
  const perChain: Array<Record<string, unknown>> = [];
  const allInFlight: InFlight[] = [];
  const warnings: string[] = [];

  for (const chainId of FOREIGN_BRIDGE_CHAIN_IDS) {
    const chainConfig = chains[String(chainId)];

    if (!chainConfig) {
      // Silence here would read as "nothing pending on that chain", which is
      // the exact mistake that strands funds.
      warnings.push(
        `Chain ${chainId} was NOT scanned - no RPC in the chains file. Any deposit ` +
          'pending there is unaccounted for.',
      );
      console.log(`\n  chain ${chainId}: SKIPPED (no rpc configured)`);
      perChain.push({ chainId, scanned: false });
      continue;
    }

    const bridgeAddress = bridgeAddressFor(chainId);
    if (!bridgeAddress) {
      warnings.push(`Chain ${chainId} has no bridge address in the registry`);
      continue;
    }

    console.log(`\n  chain ${chainId} (${chainConfig.rpc})`);

    const rpc = new RpcClient({
      url: chainConfig.rpc,
      batchSize: chainConfig.batchSize ?? 50,
      concurrency: 4,
    });

    const actualChainId = hexToNumber(await rpc.call<string>('eth_chainId'));
    if (actualChainId !== chainId) {
      warnings.push(
        `Chain ${chainId} entry points at an RPC reporting chain ${actualChainId} - skipped`,
      );
      console.log(`    !! RPC reports chain ${actualChainId}, expected ${chainId} - skipping`);
      perChain.push({ chainId, scanned: false, error: `rpc is chain ${actualChainId}` });
      continue;
    }

    const head = hexToNumber(await rpc.call<string>('eth_blockNumber'));
    const fromBlock = chainConfig.fromBlock ?? 0;
    const toBlock = chainConfig.toBlock ?? head;

    if (chainConfig.fromBlock === undefined) {
      console.log('    no fromBlock set - scanning from genesis, this will be slow');
    }

    const progress = new Progress(`inbound:${chainId}`, toBlock - fromBlock + 1);
    let deposits = 0;
    let toFushuma = 0;
    let unclaimed = 0;

    for (const range of splitBlockRange(fromBlock, toBlock, chainConfig.logRange ?? 2_000)) {
      const logs = await fetchLogsAdaptive(rpc, range, {
        address: bridgeAddress,
        topics: [depositTopics],
      });

      for (const log of logs as Array<{
        topics: string[];
        data?: string;
        blockNumber?: string;
        transactionHash?: string;
      }>) {
        deposits += 1;

        let decoded;
        try {
          decoded = decodeEventLog({
            abi: BRIDGE_ABI,
            topics: log.topics as [Hex, ...Hex[]],
            data: (log.data ?? '0x') as Hex,
          });
        } catch {
          continue;
        }

        // viem widens args to `readonly unknown[] | undefined` for a runtime-loaded
        // ABI, so the named-argument shape has to be asserted through unknown.
        const eventArgs = decoded.args as unknown as Record<string, unknown>;

        // Only deposits addressed to Fushuma are this fork's problem.
        if (Number(eventArgs.toChainId as bigint) !== FUSHUMA_CHAIN_ID) continue;
        toFushuma += 1;

        const txHash = (log.transactionHash ?? '').toLowerCase();
        if (claimedByPair.has(`${chainId}:${txHash}`) || claimedByTxId.has(txHash)) continue;

        unclaimed += 1;
        const record: InFlight = {
          sourceChainId: chainId,
          depositTxHash: txHash,
          block: log.blockNumber ? Number(BigInt(log.blockNumber)) : null,
          receiver: normalizeAddress(eventArgs.receiver as string),
          token: normalizeAddress(eventArgs.token as string),
          originalToken: normalizeAddress(eventArgs.originalToken as string),
          originalChainID: String(eventArgs.originalChainID as bigint),
          value: String(eventArgs.value as bigint),
          toContract: eventArgs.toContract
            ? normalizeAddress(eventArgs.toContract as string)
            : null,
          kind: String(decoded.eventName),
        };

        allInFlight.push(record);
        await writer.write(record);
      }

      progress.advance(range.to - range.from + 1);
    }

    progress.finish();

    const matchRate = toFushuma > 0 ? ((toFushuma - unclaimed) / toFushuma) * 100 : 100;

    console.log(
      `    ${deposits.toLocaleString()} deposits, ${toFushuma.toLocaleString()} to Fushuma, ` +
        `${unclaimed.toLocaleString()} UNCLAIMED (${matchRate.toFixed(1)}% matched)`,
    );

    // A near-zero match rate means the txId matching rule does not hold for
    // this deployment, not that every transfer is outstanding.
    if (toFushuma >= 20 && matchRate < 50) {
      warnings.push(
        `Chain ${chainId}: only ${matchRate.toFixed(1)}% of deposits matched a Fushuma claim. ` +
          'Either a real backlog, or Claim.txId is not the deposit transaction hash for this ' +
          'deployment - verify one case by hand before treating this list as the liability set.',
      );
    }

    perChain.push({
      chainId,
      scanned: true,
      fromBlock,
      toBlock,
      deposits,
      depositsToFushuma: toFushuma,
      unclaimed,
      matchRatePercent: Number(matchRate.toFixed(2)),
    });
  }

  const file = await writer.close();

  // ---- totals per token ---------------------------------------------------
  const byToken = new Map<string, { count: number; total: bigint }>();
  for (const entry of allInFlight) {
    const current = byToken.get(entry.token) ?? { count: 0, total: 0n };
    current.count += 1;
    current.total += BigInt(entry.value);
    byToken.set(entry.token, current);
  }

  const outstanding = [...byToken.entries()]
    .map(([token, value]) => ({
      token,
      transfers: value.count,
      totalValue: value.total.toString(),
      // Decimals are not known here without a per-token read on each chain;
      // 18 is shown as a convenience only.
      approxAt18Decimals: formatUnits(value.total, 18),
    }))
    .sort((a, b) => b.transfers - a.transfers);

  await writeJsonFile(join(dir, 'bridge', 'inbound-summary.json'), {
    freezeBlock: manifest?.freezeBlock ?? null,
    freezeBlockHash: manifest?.freezeBlockHash ?? null,
    generatedAt: new Date().toISOString(),
    chains: perChain,
    totalUnclaimed: allInFlight.length,
    outstandingByToken: outstanding,
    warnings,
    note:
      'Each entry is a deposit taken on a foreign chain whose tokens had not been claimed ' +
      'on Fushuma at the freeze block. The foreign bridge does not fork: these remain owed ' +
      'after the migration and must stay claimable, or be settled manually.',
  });

  console.log(`\n${allInFlight.length.toLocaleString()} unclaimed inbound transfer(s)`);
  console.log(`  detail  ${file.path}`);

  for (const entry of outstanding.slice(0, 10)) {
    console.log(
      `  ${entry.token}  ${entry.transfers} transfer(s)  ${entry.approxAt18Decimals} (at 18dp)`,
    );
  }

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const warning of warnings) console.log(`  - ${warning}`);
  }

  if (allInFlight.length > 0) {
    console.log(
      '\nThese transfers are a live liability. Carry them into the migration plan before ' +
        'the fork - the foreign bridges keep running and will not replay them.',
    );
  }
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index !== -1) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.slice(name.length + 3) : undefined;
}

main().catch((error: unknown) => {
  console.error('Inbound scan error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
