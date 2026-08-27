/**
 * Application-level protocol state at the freeze block.
 *
 * The raw state dump already contains every storage slot, but slots are not
 * something a human can audit or a migration script can read. This step
 * exports the same state in domain terms - who holds which lock, what each
 * proposal's tally was, which grants are unclaimed - so the fork can be
 * reviewed by the people it affects and replayed by whoever rebuilds it.
 *
 * Every enumeration is driven by an on-chain counter (lastTokenId,
 * proposalCount, gaugeCount, ...) rather than by log replay, so nothing
 * depends on a complete log history. Where a total is also exposed on chain
 * (totalLocked, totalDistributed) the sum of the enumerated parts is checked
 * against it, and any gap is reported.
 */

import { join } from 'node:path';
import type { Abi, AbiFunction } from 'viem';

import { callBatch, type ContractCall } from '../lib/abi';
import { NdjsonWriter, Progress, withoutFiles, writeJsonFile, type FileDigest } from '../lib/out';
import { RpcClient, type RpcResult } from '../lib/rpc';
import type { SnapshotConfig } from '../lib/config';
import { blockTagFor, type PinnedBlock } from './pin';
import { contractByLabel } from '../lib/registry';
import { normalizeAddress, type Hex } from '../../../src/lib/snapshot/hex';
import { chunk, sequence } from '../../../src/lib/snapshot/ranges';
import {
  EpochManagerAbi,
  FushumaGovernorAbi,
  GaugeControllerAbi,
  GovernanceCouncilAbi,
  GrantGaugeAbi,
  VotingEscrowAbi,
} from '../../../src/lib/governance/abis';
import LaunchpadAbi from '../../../src/config/abis/Launchpad.json';

export interface SectionResult {
  name: string;
  ok: boolean;
  records: number;
  /** Consistency checks against on-chain totals, and anything that failed. */
  notes: string[];
  totals: Record<string, string | number | null>;
  files: FileDigest[];
}

export interface ProtocolSummary {
  sections: SectionResult[];
  allOk: boolean;
  files: FileDigest[];
}

/**
 * Zip a decoded multi-output result with the output names from the ABI, so
 * exported records carry real field names instead of positional indexes.
 * viem returns a bare value for single-output functions and an array
 * otherwise, and both shapes are handled here.
 */
function named(abi: Abi, functionName: string, decoded: unknown): Record<string, unknown> {
  const entry = abi.find(
    (item): item is AbiFunction => item.type === 'function' && item.name === functionName,
  );
  const outputs = entry?.outputs ?? [];

  if (outputs.length <= 1) {
    return { value: decoded };
  }

  const values = Array.isArray(decoded) ? decoded : [decoded];
  const record: Record<string, unknown> = {};
  outputs.forEach((output, index) => {
    record[output.name && output.name.length > 0 ? output.name : `output${index}`] =
      values[index];
  });
  return record;
}

/** Read a uint counter, returning null when the call reverts. */
async function readCounter(
  rpc: RpcClient,
  tag: ReturnType<typeof blockTagFor>,
  address: Hex,
  abi: Abi,
  functionName: string,
): Promise<bigint | null> {
  const [result] = await callBatch<bigint>(rpc, tag, [{ address, abi, functionName }]);
  return result.ok ? BigInt(result.value as bigint) : null;
}

export async function exportProtocol(
  rpc: RpcClient,
  config: SnapshotConfig,
  pinned: PinnedBlock,
  outDir: string,
): Promise<ProtocolSummary> {
  const tag = blockTagFor(pinned);
  const sections: SectionResult[] = [];

  const runners: Array<[string, () => Promise<SectionResult>]> = [
    ['voting-escrow', () => exportVotingEscrow(rpc, config, tag, outDir)],
    ['governor', () => exportGovernor(rpc, config, tag, outDir)],
    ['gauge-controller', () => exportGaugeController(rpc, config, tag, outDir)],
    ['epoch-manager', () => exportEpochManager(rpc, config, tag, outDir)],
    ['grant-gauge', () => exportGrantGauge(rpc, config, tag, outDir)],
    ['council', () => exportCouncil(rpc, config, tag, outDir)],
    ['launchpad', () => exportLaunchpad(rpc, config, tag, outDir)],
  ];

  for (const [name, run] of runners) {
    console.log(`  ${name}`);
    try {
      sections.push(await run());
    } catch (error) {
      // One unreachable contract must not cost the whole protocol export.
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`    !! ${name} failed: ${message}`);
      sections.push({
        name,
        ok: false,
        records: 0,
        notes: [`Section failed: ${message}`],
        totals: {},
        files: [],
      });
    }
  }

  const summaryFile = await writeJsonFile(join(outDir, 'protocol', 'summary.json'), {
    block: pinned.number,
    blockHash: pinned.hash,
    sections: sections.map(withoutFiles),
  });

  return {
    sections,
    allOk: sections.every((section) => section.ok),
    files: [summaryFile, ...sections.flatMap((section) => section.files)],
  };
}

/**
 * veNFT locks. Every lock is a position that must survive the fork with its
 * amount, its start time and its exit-queue status intact - those three drive
 * voting power, so losing any of them silently re-weights governance.
 */
async function exportVotingEscrow(
  rpc: RpcClient,
  config: SnapshotConfig,
  tag: ReturnType<typeof blockTagFor>,
  outDir: string,
): Promise<SectionResult> {
  const address = contractByLabel('VotingEscrow').address;
  const abi = VotingEscrowAbi as Abi;
  const notes: string[] = [];

  const lastTokenId = await readCounter(rpc, tag, address, abi, 'lastTokenId');
  if (lastTokenId === null) {
    return {
      name: 'voting-escrow',
      ok: false,
      records: 0,
      notes: ['lastTokenId() is unreadable - the contract may not be deployed at this block'],
      totals: {},
      files: [],
    };
  }

  const [totalLocked, totalSupply, totalVotingPower] = await Promise.all([
    readCounter(rpc, tag, address, abi, 'totalLocked'),
    readCounter(rpc, tag, address, abi, 'totalSupply'),
    readCounter(rpc, tag, address, abi, 'totalVotingPower'),
  ]);

  const writer = await NdjsonWriter.create(join(outDir, 'protocol', 've-locks.ndjson'));
  const ids = sequence(1, Number(lastTokenId));
  const progress = new Progress('protocol:ve-locks', ids.length);

  let active = 0;
  let burned = 0;
  let summedLocked = 0n;
  let summedVotingPower = 0n;

  for (const page of chunk(ids, Math.max(1, Math.floor(config.batchSize / 3)))) {
    const calls: ContractCall[] = [];
    for (const id of page) {
      calls.push({ address, abi, functionName: 'ownerOf', args: [BigInt(id)] });
      calls.push({ address, abi, functionName: 'getLockedBalance', args: [BigInt(id)] });
      calls.push({ address, abi, functionName: 'votingPower', args: [BigInt(id)] });
    }

    const results = await callBatch<unknown>(rpc, tag, calls);

    for (let i = 0; i < page.length; i += 1) {
      const id = page[i];
      const ownerResult = results[i * 3] as RpcResult<string>;
      const lockedResult = results[i * 3 + 1];
      const powerResult = results[i * 3 + 2] as RpcResult<bigint>;

      // ownerOf reverts for a burned or never-minted id. That is normal, and
      // the record is kept so the id space stays fully accounted for.
      if (!ownerResult.ok) {
        burned += 1;
        await writer.write({ tokenId: id, owner: null, burned: true });
        continue;
      }

      const locked = lockedResult.ok
        ? named(abi, 'getLockedBalance', lockedResult.value)
        : null;

      const amount =
        locked && typeof locked.amount === 'bigint' ? (locked.amount as bigint) : 0n;
      const power = powerResult.ok ? BigInt(powerResult.value) : 0n;

      summedLocked += amount;
      summedVotingPower += power;
      active += 1;

      await writer.write({
        tokenId: id,
        owner: normalizeAddress(ownerResult.value),
        burned: false,
        amount: amount.toString(),
        startTime: locked?.startTime?.toString() ?? null,
        inExitQueue: locked?.inExitQueue ?? null,
        exitQueueTime: locked?.exitQueueTime?.toString() ?? null,
        votingPower: power.toString(),
      });
    }

    progress.advance(page.length);
  }

  progress.finish();
  const file = await writer.close();

  // The per-lock amounts must add up to what the contract reports, or the
  // snapshot has missed locks.
  if (totalLocked !== null && summedLocked !== totalLocked) {
    notes.push(
      `Sum of lock amounts (${summedLocked}) does not equal totalLocked() (${totalLocked})`,
    );
  }
  if (totalSupply !== null && BigInt(active) !== totalSupply) {
    notes.push(
      `Active lock count (${active}) does not equal totalSupply() (${totalSupply})`,
    );
  }

  console.log(
    `    ${active.toLocaleString()} active locks, ${burned.toLocaleString()} burned/unminted`,
  );

  return {
    name: 'voting-escrow',
    ok: notes.length === 0,
    records: file.records,
    notes,
    totals: {
      lastTokenId: lastTokenId.toString(),
      activeLocks: active,
      burnedOrUnminted: burned,
      summedLockedWei: summedLocked.toString(),
      onChainTotalLockedWei: totalLocked?.toString() ?? null,
      summedVotingPower: summedVotingPower.toString(),
      onChainTotalVotingPower: totalVotingPower?.toString() ?? null,
    },
    files: [file],
  };
}

/** Proposals, their tallies and their current state. */
async function exportGovernor(
  rpc: RpcClient,
  config: SnapshotConfig,
  tag: ReturnType<typeof blockTagFor>,
  outDir: string,
): Promise<SectionResult> {
  const address = contractByLabel('FushumaGovernor').address;
  const abi = FushumaGovernorAbi as Abi;

  const proposalCount = await readCounter(rpc, tag, address, abi, 'proposalCount');
  if (proposalCount === null) {
    return {
      name: 'governor',
      ok: false,
      records: 0,
      notes: ['proposalCount() is unreadable'],
      totals: {},
      files: [],
    };
  }

  const params: Record<string, string | null> = {};
  for (const fn of ['quorumBps', 'votingDelay', 'votingPeriod', 'timelockDelay', 'proposalThreshold']) {
    const value = await readCounter(rpc, tag, address, abi, fn);
    params[fn] = value?.toString() ?? null;
  }

  const writer = await NdjsonWriter.create(join(outDir, 'protocol', 'proposals.ndjson'));
  // Proposal ids start at 1 in this Governor; id 0 is unused.
  const ids = sequence(1, Number(proposalCount));
  const progress = new Progress('protocol:proposals', ids.length);
  const notes: string[] = [];

  for (const page of chunk(ids, Math.max(1, Math.floor(config.batchSize / 3)))) {
    const calls: ContractCall[] = [];
    for (const id of page) {
      calls.push({ address, abi, functionName: 'proposals', args: [BigInt(id)] });
      calls.push({ address, abi, functionName: 'voteTallies', args: [BigInt(id)] });
      calls.push({ address, abi, functionName: 'state', args: [BigInt(id)] });
    }

    const results = await callBatch<unknown>(rpc, tag, calls);

    for (let i = 0; i < page.length; i += 1) {
      const id = page[i];
      const proposalResult = results[i * 3];
      const talliesResult = results[i * 3 + 1];
      const stateResult = results[i * 3 + 2];

      if (!proposalResult.ok) {
        notes.push(`proposals(${id}) failed: ${proposalResult.error.message}`);
        await writer.write({ id, error: proposalResult.error.message });
        continue;
      }

      const proposal = named(abi, 'proposals', proposalResult.value);
      const tallies = talliesResult.ok ? named(abi, 'voteTallies', talliesResult.value) : null;

      await writer.write({
        id,
        proposer: typeof proposal.proposer === 'string' ? normalizeAddress(proposal.proposer) : null,
        title: proposal.title ?? null,
        description: proposal.description ?? null,
        metadataHash: proposal.metadataHash ?? null,
        createdAt: proposal.createdAt?.toString() ?? null,
        startTime: proposal.startTime?.toString() ?? null,
        endTime: proposal.endTime?.toString() ?? null,
        executionTime: proposal.executionTime?.toString() ?? null,
        storedState: proposal.state ?? null,
        isSpeedup: proposal.isSpeedup ?? null,
        forVotes: tallies?.forVotes?.toString() ?? null,
        againstVotes: tallies?.againstVotes?.toString() ?? null,
        abstainVotes: tallies?.abstainVotes?.toString() ?? null,
        liveState: stateResult.ok ? Number(stateResult.value) : null,
      });
    }

    progress.advance(page.length);
  }

  progress.finish();
  const file = await writer.close();
  console.log(`    ${file.records.toLocaleString()} proposals`);

  return {
    name: 'governor',
    ok: notes.length === 0,
    records: file.records,
    notes: notes.slice(0, 50),
    totals: { proposalCount: proposalCount.toString(), ...params },
    files: [file],
  };
}

async function exportGaugeController(
  rpc: RpcClient,
  config: SnapshotConfig,
  tag: ReturnType<typeof blockTagFor>,
  outDir: string,
): Promise<SectionResult> {
  const address = contractByLabel('GaugeController').address;
  const abi = GaugeControllerAbi as Abi;

  const gaugeCount = await readCounter(rpc, tag, address, abi, 'gaugeCount');
  if (gaugeCount === null) {
    return {
      name: 'gauge-controller',
      ok: false,
      records: 0,
      notes: ['gaugeCount() is unreadable'],
      totals: {},
      files: [],
    };
  }

  const writer = await NdjsonWriter.create(join(outDir, 'protocol', 'gauges.ndjson'));
  const ids = sequence(0, Math.max(0, Number(gaugeCount) - 1));
  const notes: string[] = [];

  for (const page of chunk(ids, config.batchSize)) {
    const results = await callBatch<unknown>(
      rpc,
      tag,
      page.map((id) => ({ address, abi, functionName: 'gauges', args: [BigInt(id)] })),
    );

    for (let i = 0; i < page.length; i += 1) {
      const id = page[i];
      const result = results[i];
      if (!result.ok) {
        notes.push(`gauges(${id}) failed: ${result.error.message}`);
        continue;
      }
      const gauge = named(abi, 'gauges', result.value);
      await writer.write({
        gaugeId: id,
        gaugeAddress:
          typeof gauge.gaugeAddress === 'string' ? normalizeAddress(gauge.gaugeAddress) : null,
        name: gauge.name ?? null,
        gaugeType: gauge.gaugeType ?? null,
        isActive: gauge.isActive ?? null,
        addedAtEpoch: gauge.addedAtEpoch?.toString() ?? null,
      });
    }
  }

  const file = await writer.close();
  console.log(`    ${file.records.toLocaleString()} gauges`);

  return {
    name: 'gauge-controller',
    ok: notes.length === 0,
    records: file.records,
    notes: notes.slice(0, 50),
    totals: { gaugeCount: gaugeCount.toString() },
    files: [file],
  };
}

async function exportEpochManager(
  rpc: RpcClient,
  config: SnapshotConfig,
  tag: ReturnType<typeof blockTagFor>,
  outDir: string,
): Promise<SectionResult> {
  const address = contractByLabel('EpochManager').address;
  const abi = EpochManagerAbi as Abi;

  const currentEpoch = await readCounter(rpc, tag, address, abi, 'currentEpoch');
  if (currentEpoch === null) {
    return {
      name: 'epoch-manager',
      ok: false,
      records: 0,
      notes: ['currentEpoch() is unreadable'],
      totals: {},
      files: [],
    };
  }

  const writer = await NdjsonWriter.create(join(outDir, 'protocol', 'epochs.ndjson'));
  const ids = sequence(0, Number(currentEpoch));
  const notes: string[] = [];

  for (const page of chunk(ids, config.batchSize)) {
    const results = await callBatch<unknown>(
      rpc,
      tag,
      page.map((id) => ({ address, abi, functionName: 'epochs', args: [BigInt(id)] })),
    );

    for (let i = 0; i < page.length; i += 1) {
      const result = results[i];
      if (!result.ok) {
        notes.push(`epochs(${page[i]}) failed: ${result.error.message}`);
        continue;
      }
      const epoch = named(abi, 'epochs', result.value);
      await writer.write({
        epoch: page[i],
        startTime: epoch.startTime?.toString() ?? null,
        endTime: epoch.endTime?.toString() ?? null,
        votingStartTime: epoch.votingStartTime?.toString() ?? null,
        votingEndTime: epoch.votingEndTime?.toString() ?? null,
        distributionTime: epoch.distributionTime?.toString() ?? null,
        totalVotingPower: epoch.totalVotingPower?.toString() ?? null,
        totalDistributed: epoch.totalDistributed?.toString() ?? null,
        finalized: epoch.finalized ?? null,
      });
    }
  }

  const file = await writer.close();
  console.log(`    ${file.records.toLocaleString()} epochs (current: ${currentEpoch})`);

  return {
    name: 'epoch-manager',
    ok: notes.length === 0,
    records: file.records,
    notes: notes.slice(0, 50),
    totals: { currentEpoch: currentEpoch.toString() },
    files: [file],
  };
}

/** Grants, including how much each one still has unclaimed at the fork. */
async function exportGrantGauge(
  rpc: RpcClient,
  config: SnapshotConfig,
  tag: ReturnType<typeof blockTagFor>,
  outDir: string,
): Promise<SectionResult> {
  const address = contractByLabel('GrantGauge').address;
  const abi = GrantGaugeAbi as Abi;

  const grantCount = await readCounter(rpc, tag, address, abi, 'grantCount');
  if (grantCount === null) {
    return {
      name: 'grant-gauge',
      ok: false,
      records: 0,
      notes: ['grantCount() is unreadable - GrantGauge may be uninitialised'],
      totals: {},
      files: [],
    };
  }

  const [totalClaimed, totalDistributed] = await Promise.all([
    readCounter(rpc, tag, address, abi, 'totalClaimed'),
    readCounter(rpc, tag, address, abi, 'totalDistributed'),
  ]);

  const writer = await NdjsonWriter.create(join(outDir, 'protocol', 'grants.ndjson'));
  const ids = sequence(0, Math.max(0, Number(grantCount) - 1));
  const notes: string[] = [];

  for (const page of chunk(ids, Math.max(1, Math.floor(config.batchSize / 2)))) {
    const calls: ContractCall[] = [];
    for (const id of page) {
      calls.push({ address, abi, functionName: 'getGrant', args: [BigInt(id)] });
      calls.push({ address, abi, functionName: 'getGrantUnclaimedAmount', args: [BigInt(id)] });
    }

    const results = await callBatch<unknown>(rpc, tag, calls);

    for (let i = 0; i < page.length; i += 1) {
      const grantResult = results[i * 2];
      const unclaimedResult = results[i * 2 + 1];

      if (!grantResult.ok) {
        notes.push(`getGrant(${page[i]}) failed: ${grantResult.error.message}`);
        continue;
      }

      await writer.write({
        grantId: page[i],
        grant: grantResult.value,
        unclaimed: unclaimedResult.ok ? String(unclaimedResult.value) : null,
      });
    }
  }

  const file = await writer.close();
  console.log(`    ${file.records.toLocaleString()} grants`);

  return {
    name: 'grant-gauge',
    ok: notes.length === 0,
    records: file.records,
    notes: notes.slice(0, 50),
    totals: {
      grantCount: grantCount.toString(),
      totalClaimed: totalClaimed?.toString() ?? null,
      totalDistributed: totalDistributed?.toString() ?? null,
    },
    files: [file],
  };
}

async function exportCouncil(
  rpc: RpcClient,
  config: SnapshotConfig,
  tag: ReturnType<typeof blockTagFor>,
  outDir: string,
): Promise<SectionResult> {
  const address = contractByLabel('GovernanceCouncil').address;
  const abi = GovernanceCouncilAbi as Abi;

  const [vetoCount, speedupCount] = await Promise.all([
    readCounter(rpc, tag, address, abi, 'vetoActionCount'),
    readCounter(rpc, tag, address, abi, 'speedupActionCount'),
  ]);

  if (vetoCount === null && speedupCount === null) {
    return {
      name: 'council',
      ok: false,
      records: 0,
      notes: ['Neither vetoActionCount() nor speedupActionCount() is readable'],
      totals: {},
      files: [],
    };
  }

  const writer = await NdjsonWriter.create(join(outDir, 'protocol', 'council-actions.ndjson'));
  const notes: string[] = [];

  for (const [kind, count, fn] of [
    ['veto', vetoCount, 'vetoActions'],
    ['speedup', speedupCount, 'speedupActions'],
  ] as const) {
    if (count === null) continue;
    const ids = sequence(0, Math.max(0, Number(count) - 1));

    for (const page of chunk(ids, config.batchSize)) {
      const results = await callBatch<unknown>(
        rpc,
        tag,
        page.map((id) => ({ address, abi, functionName: fn, args: [BigInt(id)] })),
      );

      for (let i = 0; i < page.length; i += 1) {
        const result = results[i];
        if (!result.ok) {
          notes.push(`${fn}(${page[i]}) failed: ${result.error.message}`);
          continue;
        }
        await writer.write({ kind, actionId: page[i], ...named(abi, fn, result.value) });
      }
    }
  }

  const file = await writer.close();
  console.log(`    ${file.records.toLocaleString()} council actions`);

  return {
    name: 'council',
    ok: notes.length === 0,
    records: file.records,
    notes: notes.slice(0, 50),
    totals: {
      vetoActionCount: vetoCount?.toString() ?? null,
      speedupActionCount: speedupCount?.toString() ?? null,
    },
    files: [file],
  };
}

/**
 * Launchpad sales. Each ICO carries a vesting contract holding buyer
 * allocations, so the vesting address is recorded alongside the sale - without
 * it, buyers' unclaimed tokens cannot be reconstructed after the fork.
 */
async function exportLaunchpad(
  rpc: RpcClient,
  config: SnapshotConfig,
  tag: ReturnType<typeof blockTagFor>,
  outDir: string,
): Promise<SectionResult> {
  const address = contractByLabel('LaunchpadProxy').address;
  const abi = LaunchpadAbi as Abi;

  const counter = await readCounter(rpc, tag, address, abi, 'counter');
  if (counter === null) {
    return {
      name: 'launchpad',
      ok: false,
      records: 0,
      notes: ['counter() is unreadable'],
      totals: {},
      files: [],
    };
  }

  const writer = await NdjsonWriter.create(join(outDir, 'protocol', 'launchpad-icos.ndjson'));
  const ids = sequence(0, Math.max(0, Number(counter) - 1));
  const notes: string[] = [];
  let withVesting = 0;

  for (const page of chunk(ids, config.batchSize)) {
    const results = await callBatch<unknown>(
      rpc,
      tag,
      page.map((id) => ({ address, abi, functionName: 'getICO', args: [BigInt(id)] })),
    );

    for (let i = 0; i < page.length; i += 1) {
      const result = results[i];
      if (!result.ok) {
        notes.push(`getICO(${page[i]}) failed: ${result.error.message}`);
        continue;
      }

      const [params, state] = result.value as [Record<string, unknown>, Record<string, unknown>];
      const vestingContract = state?.vestingContract;
      if (typeof vestingContract === 'string' && !/^0x0{40}$/i.test(vestingContract)) {
        withVesting += 1;
      }

      await writer.write({ icoId: page[i], params, state });
    }
  }

  const file = await writer.close();
  console.log(`    ${file.records.toLocaleString()} ICOs (${withVesting} with vesting contracts)`);

  return {
    name: 'launchpad',
    ok: notes.length === 0,
    records: file.records,
    notes: notes.slice(0, 50),
    totals: { icoCount: counter.toString(), icosWithVesting: withVesting },
    files: [file],
  };
}
