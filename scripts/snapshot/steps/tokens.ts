/**
 * ERC-20 holder sets at the freeze block.
 *
 * Balances live in a mapping that cannot be enumerated, so the holder list is
 * rebuilt by replaying every Transfer log from genesis. A replay is a claim,
 * not a fact, so each one is checked three ways before it is trusted:
 *
 *   1. Replayed supply (mints - burns) must equal totalSupply() on chain.
 *   2. The sum of replayed balances must equal that same supply.
 *   3. balanceOf() is re-read at the freeze block for a sample of holders -
 *      or for every holder with --full-verify - and must match exactly.
 *
 * Any mismatch is written into the summary and marks the token unverified.
 * WFUMA matters most: it is what VotingEscrow locks, so a wrong WFUMA balance
 * becomes a wrong governance weight on the forked chain.
 */

import { join } from 'node:path';

import { callBatch, ERC20_ABI, TRANSFER_TOPIC } from '../lib/abi';
import { NdjsonWriter, Progress, withoutFiles, writeJsonFile, type FileDigest } from '../lib/out';
import { RpcClient } from '../lib/rpc';
import type { SnapshotConfig } from '../lib/config';
import { blockTagFor, type PinnedBlock } from './pin';
import { fetchLogsAdaptive } from './discover';
import { formatUnits } from './accounts';
import { TRACKED_TOKENS, type TokenEntry } from '../lib/registry';
import { BalanceLedger } from '../../../src/lib/snapshot/ledger';
import { buildTree } from '../../../src/lib/snapshot/merkle';
import { hexToBigInt, topicToAddress, type Hex } from '../../../src/lib/snapshot/hex';
import { chunk, splitBlockRange } from '../../../src/lib/snapshot/ranges';

export interface TokenSnapshot {
  label: string;
  address: Hex;
  symbol: string | null;
  decimals: number;
  holders: number;
  transfers: number;
  onChainTotalSupply: string | null;
  replayedSupply: string;
  sumOfBalances: string;
  supplyMatches: boolean;
  balancesMatchSupply: boolean;
  spotChecked: number;
  spotCheckMismatches: Array<{ address: Hex; replayed: string; onChain: string }>;
  anomalies: Array<{ address: Hex; balance: string; reason: string }>;
  merkleRoot: Hex | null;
  verified: boolean;
  files: FileDigest[];
}

export interface TokensSummary {
  tokens: TokenSnapshot[];
  allVerified: boolean;
  files: FileDigest[];
}

interface RpcLog {
  address: string;
  topics: string[];
  data?: string;
}

export async function exportTokens(
  rpc: RpcClient,
  config: SnapshotConfig,
  pinned: PinnedBlock,
  outDir: string,
  tokens: readonly TokenEntry[] = TRACKED_TOKENS,
): Promise<TokensSummary> {
  const snapshots: TokenSnapshot[] = [];

  for (const token of tokens) {
    console.log(`  ${token.label} (${token.address})`);
    snapshots.push(await exportToken(rpc, config, pinned, outDir, token));
  }

  const summaryFile = await writeJsonFile(join(outDir, 'tokens', 'summary.json'), {
    block: pinned.number,
    blockHash: pinned.hash,
    tokens: snapshots.map(withoutFiles),
  });

  return {
    tokens: snapshots,
    allVerified: snapshots.every((snapshot) => snapshot.verified),
    files: [summaryFile, ...snapshots.flatMap((snapshot) => snapshot.files)],
  };
}

async function exportToken(
  rpc: RpcClient,
  config: SnapshotConfig,
  pinned: PinnedBlock,
  outDir: string,
  token: TokenEntry,
): Promise<TokenSnapshot> {
  const tag = blockTagFor(pinned);

  const [supplyResult, decimalsResult, symbolResult] = await callBatch<
    bigint | number | string
  >(rpc, tag, [
    { address: token.address, abi: ERC20_ABI, functionName: 'totalSupply' },
    { address: token.address, abi: ERC20_ABI, functionName: 'decimals' },
    { address: token.address, abi: ERC20_ABI, functionName: 'symbol' },
  ]);

  const onChainSupply = supplyResult.ok ? (supplyResult.value as bigint) : null;
  const decimals = decimalsResult.ok ? Number(decimalsResult.value) : token.decimals;
  const symbol = symbolResult.ok ? String(symbolResult.value) : null;

  // Replay every Transfer from genesis to the freeze block.
  const ledger = new BalanceLedger();
  const progress = new Progress(`tokens:${token.label}`, pinned.number + 1);
  let skippedNonErc20 = 0;

  for (const range of splitBlockRange(0, pinned.number, config.logRange)) {
    const logs = (await fetchLogsAdaptive(rpc, range, {
      address: token.address,
      topics: [TRANSFER_TOPIC],
    })) as RpcLog[];

    for (const log of logs) {
      // A standard ERC-20 Transfer indexes from and to, and carries the value
      // in data. Four topics means an ERC-721-style transfer where the third
      // indexed field is a tokenId, which must not be added as a balance.
      if (log.topics.length !== 3) {
        skippedNonErc20 += 1;
        continue;
      }

      const data = log.data ?? '0x';
      if (data.length < 66) {
        skippedNonErc20 += 1;
        continue;
      }

      ledger.applyTransfer({
        from: topicToAddress(log.topics[1]),
        to: topicToAddress(log.topics[2]),
        value: hexToBigInt(data.slice(0, 66)),
      });
    }

    progress.advance(range.to - range.from + 1);
  }

  progress.finish();

  if (skippedNonErc20 > 0) {
    console.log(`    skipped ${skippedNonErc20} non-ERC20-shaped Transfer logs`);
  }

  const summary = ledger.summary();
  const holders = ledger.holders();

  const writer = await NdjsonWriter.create(
    join(outDir, 'tokens', `${token.label.toLowerCase()}-holders.ndjson`),
  );
  for (const holder of holders) {
    await writer.write({
      address: holder.address,
      balance: holder.balance.toString(),
      formatted: formatUnits(holder.balance, decimals),
    });
  }
  const holdersFile = await writer.close();

  // Check 3: re-read balanceOf on chain and compare against the replay.
  const toCheck = config.fullVerify
    ? holders
    : holders.slice(0, Math.min(config.verifySample, holders.length));

  const mismatches: TokenSnapshot['spotCheckMismatches'] = [];
  const verifyProgress = new Progress(`verify:${token.label}`, toCheck.length);

  for (const page of chunk(toCheck, config.batchSize)) {
    const results = await callBatch<bigint>(
      rpc,
      tag,
      page.map((holder) => ({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [holder.address],
      })),
    );

    results.forEach((result, i) => {
      const holder = page[i];
      if (!result.ok) {
        mismatches.push({
          address: holder.address,
          replayed: holder.balance.toString(),
          onChain: `read failed: ${result.error.message}`,
        });
        return;
      }
      if (result.value !== holder.balance) {
        mismatches.push({
          address: holder.address,
          replayed: holder.balance.toString(),
          onChain: result.value.toString(),
        });
      }
    });

    verifyProgress.advance(page.length);
  }

  verifyProgress.finish();

  const supplyMatches =
    onChainSupply !== null && onChainSupply === summary.derivedSupply;
  const balancesMatchSupply = summary.sumOfBalances === summary.derivedSupply;
  const verified =
    supplyMatches &&
    balancesMatchSupply &&
    mismatches.length === 0 &&
    summary.anomalies.length === 0;

  const merkleRoot = holders.length
    ? buildTree(holders.map((h) => ({ address: h.address, amount: h.balance }))).root
    : null;

  const merkleFile = await writeJsonFile(
    join(outDir, 'tokens', `${token.label.toLowerCase()}-merkle.json`),
    {
      token: token.address,
      symbol,
      decimals,
      block: pinned.number,
      blockHash: pinned.hash,
      root: merkleRoot,
      leaves: holders.length,
      totalSupply: onChainSupply?.toString() ?? null,
    },
  );

  console.log(
    `    ${holders.length.toLocaleString()} holders, ` +
      `${summary.transfers.toLocaleString()} transfers, ` +
      `${verified ? 'VERIFIED' : 'NOT VERIFIED'}`,
  );

  if (!verified) {
    if (!supplyMatches) {
      console.warn(
        `    !! replayed supply ${summary.derivedSupply} != on-chain totalSupply ` +
          `${onChainSupply ?? 'unreadable'}`,
      );
    }
    if (!balancesMatchSupply) {
      console.warn(
        `    !! sum of balances ${summary.sumOfBalances} != replayed supply ${summary.derivedSupply}`,
      );
    }
    if (mismatches.length > 0) {
      console.warn(`    !! ${mismatches.length} balanceOf mismatches (first: ${mismatches[0]?.address})`);
    }
    if (summary.anomalies.length > 0) {
      console.warn(`    !! ${summary.anomalies.length} negative balances in the replay`);
    }
  }

  return {
    label: token.label,
    address: token.address,
    symbol,
    decimals,
    holders: holders.length,
    transfers: summary.transfers,
    onChainTotalSupply: onChainSupply?.toString() ?? null,
    replayedSupply: summary.derivedSupply.toString(),
    sumOfBalances: summary.sumOfBalances.toString(),
    supplyMatches,
    balancesMatchSupply,
    spotChecked: toCheck.length,
    // Cap what lands in the summary so one systemic failure cannot produce a
    // gigabyte of JSON; the count above stays exact.
    spotCheckMismatches: mismatches.slice(0, 100),
    anomalies: summary.anomalies.slice(0, 100).map((anomaly) => ({
      address: anomaly.address,
      balance: anomaly.balance.toString(),
      reason: anomaly.reason,
    })),
    merkleRoot,
    verified,
    files: [holdersFile, merkleFile],
  };
}
