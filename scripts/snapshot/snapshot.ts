#!/usr/bin/env tsx
/**
 * Fushuma hard-fork snapshot exporter.
 *
 * Captures the network at one frozen block:
 *   state     full account + storage dump (needs a debug-enabled node)
 *   accounts  native FUMA balances, committed to a Merkle root
 *   tokens    ERC-20 holder sets, replayed from logs and verified on chain
 *   protocol  governance, gauges, grants and launchpad state in domain terms
 *   manifest  SHA-256 of every artifact, folded into one snapshot hash
 *
 * Usage:
 *   pnpm snapshot:preflight
 *   pnpm snapshot -- --block 1234567
 *   pnpm snapshot -- --rpc http://localhost:8545 --full-verify
 *   pnpm snapshot -- --steps tokens,protocol --block 1234567
 *
 * See docs/HARDFORK_SNAPSHOT_RUNBOOK.md for the full procedure.
 */

import { join } from 'node:path';

import { loadConfig, runDirectory, shouldRun, type SnapshotConfig } from './lib/config';
import { formatDuration, withoutFiles, writeJsonFile, type FileDigest } from './lib/out';
import { RpcClient } from './lib/rpc';
import { trackedAddresses } from './lib/registry';
import { assertNoReorg, pinBlock } from './steps/pin';
import { dumpState } from './steps/state-dump';
import { discoverAddresses } from './steps/discover';
import { accountsFromDump, exportAccounts } from './steps/accounts';
import { exportTokens } from './steps/tokens';
import { exportProtocol } from './steps/protocol';
import { writeManifest } from './steps/manifest';

const TOOL_VERSION = '1.0.0';

async function main(): Promise<void> {
  const config = loadConfig();
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const rpc = new RpcClient({
    url: config.rpcUrl,
    batchSize: config.batchSize,
    concurrency: config.concurrency,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    headers: config.headers,
    verbose: config.verbose,
  });

  banner(config);

  // Pin first and always: every other step reads at this exact height.
  console.log('\n[1/6] Pinning the freeze block');
  const pinned = await pinBlock(rpc, {
    block: config.block,
    confirmations: config.confirmations,
    expectedChainId: config.chainId,
  });

  const outDir = runDirectory(config, pinned.number);
  console.log(`  block   ${pinned.number.toLocaleString()}`);
  console.log(`  hash    ${pinned.hash}`);
  console.log(`  state   ${pinned.stateRoot}`);
  console.log(`  time    ${pinned.timestampIso}`);
  console.log(`  reads   ${pinned.eip1898 ? 'pinned by block hash (EIP-1898)' : 'pinned by block number'}`);
  console.log(`  output  ${outDir}`);

  const files: FileDigest[] = [await writeJsonFile(join(outDir, 'block.json'), pinned)];
  const steps: Record<string, unknown> = {};
  const warnings: string[] = [];

  // ---- state ------------------------------------------------------------
  let stateDumped = false;

  if (shouldRun(config, 'state') && !config.skipStateDump) {
    console.log('\n[2/6] Full state dump');
    const state = await dumpState(rpc, config, pinned, outDir);
    steps.state = withoutFiles(state);
    files.push(...state.files);
    stateDumped = state.supported && state.accounts > 0;

    if (state.supported && !state.genesisReady) {
      warnings.push(
        'State dump is missing key preimages; it cannot be turned into a genesis alloc. ' +
          'Re-run the export against a node started with --cache.preimages.',
      );
    }
    if (!state.supported) {
      warnings.push(
        'No full state dump: the RPC does not expose debug_accountRange. Contract storage ' +
          'is NOT captured, so this snapshot cannot seed a re-launch genesis.',
      );
    }
  } else {
    console.log('\n[2/6] Full state dump (skipped)');
    steps.state = { skipped: true };
  }

  // ---- accounts ---------------------------------------------------------
  if (shouldRun(config, 'accounts')) {
    console.log('\n[3/6] Native FUMA balances');

    if (stateDumped) {
      // The dump already holds every balance at this height; deriving the
      // commitment from it avoids millions of redundant RPC reads.
      const accounts = await accountsFromDump(pinned, outDir);
      steps.accounts = { ...withoutFiles(accounts), source: 'state-dump' };
      files.push(...accounts.files);
    } else {
      console.log('  no state dump - discovering addresses from chain history');
      const discovery = await discoverAddresses(
        rpc,
        config,
        pinned,
        outDir,
        trackedAddresses(),
      );
      steps.discovery = withoutFiles(discovery.summary);
      files.push(...discovery.summary.files);
      warnings.push(discovery.summary.completeness);

      const accounts = await exportAccounts(rpc, config, pinned, outDir, discovery.addresses);
      steps.accounts = { ...withoutFiles(accounts), source: 'discovery' };
      files.push(...accounts.files);

      if (accounts.failedReads > 0) {
        warnings.push(`${accounts.failedReads} accounts could not be read at the freeze block.`);
      }
    }
  } else {
    console.log('\n[3/6] Native FUMA balances (skipped)');
  }

  // ---- tokens -----------------------------------------------------------
  if (shouldRun(config, 'tokens')) {
    console.log('\n[4/6] ERC-20 holder sets');
    const tokens = await exportTokens(rpc, config, pinned, outDir);
    steps.tokens = {
      allVerified: tokens.allVerified,
      tokens: tokens.tokens.map(withoutFiles),
    };
    files.push(...tokens.files);

    if (!tokens.allVerified) {
      const failed = tokens.tokens.filter((token) => !token.verified).map((token) => token.label);
      warnings.push(
        `Token balance replay did not verify for: ${failed.join(', ')}. ` +
          'Do not migrate these balances until the mismatch is explained.',
      );
    }
  } else {
    console.log('\n[4/6] ERC-20 holder sets (skipped)');
  }

  // ---- protocol ---------------------------------------------------------
  if (shouldRun(config, 'protocol')) {
    console.log('\n[5/6] Protocol state');
    const protocol = await exportProtocol(rpc, config, pinned, outDir);
    steps.protocol = {
      allOk: protocol.allOk,
      sections: protocol.sections.map(withoutFiles),
    };
    files.push(...protocol.files);

    for (const section of protocol.sections) {
      for (const note of section.notes) {
        warnings.push(`[${section.name}] ${note}`);
      }
    }
  } else {
    console.log('\n[5/6] Protocol state (skipped)');
  }

  // A reorg at any point during the export invalidates everything above,
  // because the artifacts would mix two different chains.
  console.log('\n[6/6] Re-checking the freeze block and writing the manifest');
  await assertNoReorg(rpc, pinned);
  console.log(`  freeze block still ${pinned.hash} - no reorg`);

  const manifest = await writeManifest({
    config,
    pinned,
    outDir,
    files,
    steps,
    warnings,
    startedAt,
    toolVersion: TOOL_VERSION,
  });

  console.log(`\nSnapshot complete in ${formatDuration(Date.now() - startMs)}`);
  console.log(`  snapshot hash  ${manifest.snapshotHash}`);
  console.log(`  freeze block   ${manifest.freezeBlock} (${manifest.freezeBlockHash})`);
  console.log(`  artifacts      ${manifest.files.length} files in ${outDir}`);
  console.log(
    `  rpc            ${rpc.stats.requests.toLocaleString()} calls in ` +
      `${rpc.stats.batches.toLocaleString()} batches, ${rpc.stats.retries} retries`,
  );

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const warning of warnings) console.log(`  - ${warning}`);
    console.log(
      '\nReview every warning before treating this snapshot as the fork basis.',
    );
  } else {
    console.log('\nNo warnings. All consistency checks passed.');
  }

  console.log('\nNext: verify independently with');
  console.log(`  pnpm snapshot:verify -- --dir ${outDir}`);
}

function banner(config: SnapshotConfig): void {
  console.log('Fushuma hard-fork snapshot');
  console.log(`  tool     v${TOOL_VERSION}`);
  console.log(`  rpc      ${config.rpcUrl}`);
  console.log(`  chain    ${config.chainId}`);
  console.log(
    `  batching ${config.batchSize} calls/batch, ${config.concurrency} concurrent, ` +
      `${config.logRange} blocks/log query`,
  );
  if (config.steps.length > 0) console.log(`  steps    ${config.steps.join(', ')}`);
}

main().catch((error: unknown) => {
  console.error('\nSnapshot FAILED');
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  console.error(
    '\nNothing was published. Fix the cause and re-run - partial artifacts on disk are safe ' +
      'to delete or to resume over.',
  );
  process.exit(1);
});
