/**
 * Bridge state at the freeze block.
 *
 * The bridge is the one contract where a migration can lose real money, and it
 * fails in two directions:
 *
 *  1. LOSING the processed-claim set lets every historical inbound transfer be
 *     claimed a second time. isTxProcessed(fromChainId, txId) is the only thing
 *     standing between the bridge and being drained, and it is a mapping - it
 *     cannot be enumerated by calling the contract. It is rebuilt here by
 *     replaying every Claim and ClaimToContract log, which carry txId and
 *     fromChainId explicitly, and then spot-checked back against
 *     isTxProcessed so the reconstruction is proved rather than assumed.
 *
 *  2. LOSING in-flight inbound transfers strands user funds. A deposit made on
 *     Ethereum or BSC that had not been claimed on Fushuma at the freeze block
 *     is a live liability, and it is invisible from Fushuma - it exists only in
 *     the foreign chain's logs. This step exports the processed set that
 *     scripts/snapshot/bridge-inbound.ts diffs against those foreign deposits.
 *
 * The same bridge contract is deployed at one address across seven chains, and
 * the six foreign deployments do not fork with Fushuma. They keep running,
 * still believing in chain 121224 and in the token pairs they were configured
 * with - which is why the config exported here is the checklist for putting
 * the bridge back together on the other side.
 */

import { join } from 'node:path';
import { decodeEventLog, encodeEventTopics, type Abi } from 'viem';

import { callBatch } from '../lib/abi';
import { NdjsonWriter, Progress, writeJsonFile, type FileDigest } from '../lib/out';
import { RpcClient } from '../lib/rpc';
import type { SnapshotConfig } from '../lib/config';
import { blockTagFor, type PinnedBlock } from './pin';
import { fetchLogsAdaptive } from './discover';
import { BRIDGE_ADDRESS, BRIDGE_CHAIN_IDS } from '../lib/registry';
import { ERC20_ABI } from '../lib/abi';
import { isAddress, normalizeAddress, type Hex } from '../../../src/lib/snapshot/hex';
import { chunk, splitBlockRange } from '../../../src/lib/snapshot/ranges';
import BridgeAbiJson from '../../../src/lib/bridge/abis/bridge.json';

const BRIDGE_ABI = BridgeAbiJson as Abi;

export interface BridgeToken {
  token: Hex;
  decimals: number;
  name: string;
  symbol: string;
  /** Backing the bridge believes it holds for this token. */
  deposits: string | null;
  /** What the bridge contract's balance actually is. */
  actualBalance: string | null;
  bridgeFee: string | null;
}

export interface BridgeSummary {
  ok: boolean;
  address: Hex;
  config: Record<string, unknown>;
  authorities: Hex[];
  supportedChains: Array<{ chainId: number; supported: boolean; name: string | null }>;
  tokens: BridgeToken[];
  processedClaims: number;
  outboundDeposits: number;
  /** Claims found in logs whose isTxProcessed() came back false. */
  processedMismatches: number;
  spotChecked: number;
  notes: string[];
  files: FileDigest[];
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  56: 'BNB Smart Chain',
  130: 'Unichain',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
  121224: 'Fushuma',
};

function topicFor(eventName: string): Hex {
  const [topic] = encodeEventTopics({ abi: BRIDGE_ABI, eventName });
  return topic as Hex;
}

export async function exportBridge(
  rpc: RpcClient,
  config: SnapshotConfig,
  pinned: PinnedBlock,
  outDir: string,
): Promise<BridgeSummary> {
  const tag = blockTagFor(pinned);
  const notes: string[] = [];

  const empty: BridgeSummary = {
    ok: false,
    address: BRIDGE_ADDRESS,
    config: {},
    authorities: [],
    supportedChains: [],
    tokens: [],
    processedClaims: 0,
    outboundDeposits: 0,
    processedMismatches: 0,
    spotChecked: 0,
    notes,
    files: [],
  };

  // ---- configuration -----------------------------------------------------
  // This is the checklist for standing the bridge back up: authorities,
  // threshold, fee routing, and the freeze/setup switches.
  const scalarFns = [
    'owner',
    'founders',
    'feeTo',
    'contractCaller',
    'tokenImplementation',
    'frozen',
    'setupMode',
    'threshold',
    'minRequiredAuthorities',
  ] as const;

  const scalarResults = await callBatch<unknown>(
    rpc,
    tag,
    scalarFns.map((functionName) => ({
      address: BRIDGE_ADDRESS,
      abi: BRIDGE_ABI,
      functionName,
    })),
  );

  const bridgeConfig: Record<string, unknown> = {};
  scalarFns.forEach((name, i) => {
    const result = scalarResults[i];
    if (!result.ok) {
      bridgeConfig[name] = null;
      notes.push(`${name}() is unreadable: ${result.error.message}`);
      return;
    }
    // viem hands back checksummed addresses; lowercase them so the whole
    // export keeps one casing and stays byte-reproducible.
    const value = result.value;
    bridgeConfig[name] =
      typeof value === 'bigint'
        ? value.toString()
        : isAddress(value)
          ? normalizeAddress(value)
          : value;
  });

  if (scalarResults.every((result) => !result.ok)) {
    notes.push(
      `No view on the bridge at ${BRIDGE_ADDRESS} responded at block ${pinned.number}. ` +
        'Check the address in scripts/snapshot/lib/registry.ts.',
    );
    return { ...empty, notes };
  }

  const [authoritiesResult] = await callBatch<readonly string[]>(rpc, tag, [
    { address: BRIDGE_ADDRESS, abi: BRIDGE_ABI, functionName: 'getAuthorities' },
  ]);

  const authorities = authoritiesResult.ok
    ? authoritiesResult.value.map((a) => normalizeAddress(a))
    : [];

  if (!authoritiesResult.ok) notes.push('getAuthorities() is unreadable');

  // Which authorities are "required" - a signature from each is mandatory
  // regardless of threshold, so this must be reproduced exactly.
  const requiredResults = await callBatch<boolean>(
    rpc,
    tag,
    authorities.map((authority) => ({
      address: BRIDGE_ADDRESS,
      abi: BRIDGE_ABI,
      functionName: 'requiredAuthorities',
      args: [authority],
    })),
  );

  const authorityDetail = authorities.map((authority, i) => ({
    authority,
    required: requiredResults[i]?.ok ? requiredResults[i].value : null,
  }));

  // ---- supported chains --------------------------------------------------
  const chainResults = await callBatch<boolean>(
    rpc,
    tag,
    BRIDGE_CHAIN_IDS.map((chainId) => ({
      address: BRIDGE_ADDRESS,
      abi: BRIDGE_ABI,
      functionName: 'isSupported',
      args: [BigInt(chainId)],
    })),
  );

  const supportedChains = BRIDGE_CHAIN_IDS.map((chainId, i) => ({
    chainId,
    supported: chainResults[i]?.ok ? chainResults[i].value : false,
    name: CHAIN_NAMES[chainId] ?? null,
  }));

  // ---- tokens and their backing ------------------------------------------
  const [tokenListResult] = await callBatch<
    ReadonlyArray<{ token: string; decimals: number; name: string; symbol: string }>
  >(rpc, tag, [{ address: BRIDGE_ADDRESS, abi: BRIDGE_ABI, functionName: 'getTokenList' }]);

  const tokens: BridgeToken[] = [];

  if (!tokenListResult.ok) {
    notes.push(`getTokenList() is unreadable: ${tokenListResult.error.message}`);
  } else {
    const list = tokenListResult.value;

    for (const page of chunk([...list], Math.max(1, Math.floor(config.batchSize / 3)))) {
      const results = await callBatch<unknown>(rpc, tag, [
        ...page.map((entry) => ({
          address: BRIDGE_ADDRESS,
          abi: BRIDGE_ABI,
          functionName: 'tokenDeposits',
          args: [entry.token],
        })),
        ...page.map((entry) => ({
          address: BRIDGE_ADDRESS,
          abi: BRIDGE_ABI,
          functionName: 'getBridgeFee',
          args: [entry.token],
        })),
        ...page.map((entry) => ({
          address: normalizeAddress(entry.token),
          abi: ERC20_ABI as Abi,
          functionName: 'balanceOf',
          args: [BRIDGE_ADDRESS],
        })),
      ]);

      page.forEach((entry, i) => {
        const deposits = results[i];
        const fee = results[page.length + i];
        const balance = results[page.length * 2 + i];

        const token: BridgeToken = {
          token: normalizeAddress(entry.token),
          decimals: Number(entry.decimals),
          name: entry.name,
          symbol: entry.symbol,
          deposits: deposits?.ok ? String(deposits.value) : null,
          actualBalance: balance?.ok ? String(balance.value) : null,
          bridgeFee: fee?.ok ? String(fee.value) : null,
        };

        // The bridge holding less than it thinks it owes is the single most
        // important thing to notice before a migration.
        if (token.deposits !== null && token.actualBalance !== null) {
          if (BigInt(token.actualBalance) < BigInt(token.deposits)) {
            notes.push(
              `${token.symbol} (${token.token}): bridge holds ${token.actualBalance} but ` +
                `tokenDeposits() claims ${token.deposits} - the backing is short`,
            );
          }
        }

        tokens.push(token);
      });
    }
  }

  // ---- processed claims (replay protection) ------------------------------
  const claimTopics = [topicFor('Claim'), topicFor('ClaimToContract')];
  const depositTopics = [topicFor('Deposit'), topicFor('BridgeToContract')];

  const claimWriter = await NdjsonWriter.create(
    join(outDir, 'bridge', 'processed-claims.ndjson'),
  );
  const depositWriter = await NdjsonWriter.create(
    join(outDir, 'bridge', 'outbound-deposits.ndjson'),
  );

  const progress = new Progress('bridge:logs', pinned.number + 1);
  const processed: Array<{ fromChainId: number; txId: Hex }> = [];
  let outboundCount = 0;

  for (const range of splitBlockRange(0, pinned.number, config.logRange)) {
    const logs = await fetchLogsAdaptive(rpc, range, {
      address: BRIDGE_ADDRESS,
      // topic0 as an array matches any of the four bridge events in one query.
      topics: [[...claimTopics, ...depositTopics]],
    });

    for (const log of logs as Array<{
      topics: string[];
      data?: string;
      blockNumber?: string;
      transactionHash?: string;
    }>) {
      let decoded;
      try {
        decoded = decodeEventLog({
          abi: BRIDGE_ABI,
          topics: log.topics as [Hex, ...Hex[]],
          data: (log.data ?? '0x') as Hex,
        });
      } catch {
        // A log the current ABI cannot decode means the deployed contract
        // emitted something this ABI does not describe. Surface it rather
        // than dropping it silently.
        notes.push(
          `Undecodable bridge log at block ${log.blockNumber ?? '?'} (topic ${log.topics[0]})`,
        );
        continue;
      }

      // viem widens args to `readonly unknown[] | undefined` for a runtime-loaded
      // ABI, so the named-argument shape has to be asserted through unknown.
      const args = decoded.args as unknown as Record<string, unknown>;

      if (decoded.eventName === 'Claim' || decoded.eventName === 'ClaimToContract') {
        const fromChainId = Number(args.fromChainId as bigint);
        const txId = args.txId as Hex;

        processed.push({ fromChainId, txId });

        await claimWriter.write({
          kind: String(decoded.eventName),
          fromChainId,
          txId,
          to: normalizeAddress(args.to as string),
          token: normalizeAddress(args.token as string),
          originalToken: normalizeAddress(args.originalToken as string),
          originalChainID: String(args.originalChainID as bigint),
          value: String(args.value as bigint),
          toContract: args.toContract ? normalizeAddress(args.toContract as string) : null,
          block: log.blockNumber ? Number(BigInt(log.blockNumber)) : null,
          claimTxHash: log.transactionHash ?? null,
        });
      } else {
        outboundCount += 1;
        await depositWriter.write({
          kind: String(decoded.eventName),
          toChainId: Number(args.toChainId as bigint),
          receiver: normalizeAddress(args.receiver as string),
          token: normalizeAddress(args.token as string),
          originalToken: normalizeAddress(args.originalToken as string),
          originalChainID: String(args.originalChainID as bigint),
          value: String(args.value as bigint),
          toContract: args.toContract ? normalizeAddress(args.toContract as string) : null,
          block: log.blockNumber ? Number(BigInt(log.blockNumber)) : null,
          // The foreign chain's claim will carry this hash as its txId.
          depositTxHash: log.transactionHash ?? null,
        });
      }
    }

    progress.advance(range.to - range.from + 1);
  }

  progress.finish();
  const claimFile = await claimWriter.close();
  const depositFile = await depositWriter.close();

  // ---- prove the reconstruction ------------------------------------------
  // Every (fromChainId, txId) recovered from logs must read back as processed.
  // If one does not, the log replay is not a faithful picture of the mapping
  // and must not be used to seed replay protection on a new chain.
  const toCheck = config.fullVerify
    ? processed
    : processed.slice(0, Math.min(config.verifySample, processed.length));

  let mismatches = 0;

  for (const page of chunk(toCheck, config.batchSize)) {
    const results = await callBatch<boolean>(
      rpc,
      tag,
      page.map((entry) => ({
        address: BRIDGE_ADDRESS,
        abi: BRIDGE_ABI,
        functionName: 'isTxProcessed',
        args: [BigInt(entry.fromChainId), entry.txId],
      })),
    );

    results.forEach((result, i) => {
      if (!result.ok || result.value !== true) {
        mismatches += 1;
        if (mismatches <= 20) {
          notes.push(
            `isTxProcessed(${page[i].fromChainId}, ${page[i].txId}) is not true, but a ` +
              'Claim log says it was claimed',
          );
        }
      }
    });
  }

  const configFile = await writeJsonFile(join(outDir, 'bridge', 'config.json'), {
    block: pinned.number,
    blockHash: pinned.hash,
    address: BRIDGE_ADDRESS,
    config: bridgeConfig,
    authorities: authorityDetail,
    supportedChains,
    tokens,
    reconnectChecklist:
      'The same bridge is deployed at this address on all seven chains. The six foreign ' +
      'deployments do not fork with Fushuma: they keep their authorities, token pairs and ' +
      'isSupported(121224) flag. Reproduce the authority set, threshold and token pairs ' +
      'above on the new chain, and re-seed isTxProcessed from processed-claims.ndjson ' +
      'before opening claims.',
  });

  console.log(
    `  ${processed.length.toLocaleString()} processed claims, ` +
      `${outboundCount.toLocaleString()} outbound deposits, ` +
      `${tokens.length} tokens, ${authorities.length} authorities`,
  );

  if (mismatches > 0) {
    console.warn(
      `  !! ${mismatches} claim(s) from logs do not read back as processed on chain.\n` +
        '     Do NOT use this replay to seed bridge replay protection until explained.',
    );
  }

  return {
    ok: notes.length === 0,
    address: BRIDGE_ADDRESS,
    config: bridgeConfig,
    authorities,
    supportedChains,
    tokens,
    processedClaims: processed.length,
    outboundDeposits: outboundCount,
    processedMismatches: mismatches,
    spotChecked: toCheck.length,
    notes: notes.slice(0, 100),
    files: [configFile, claimFile, depositFile],
  };
}
