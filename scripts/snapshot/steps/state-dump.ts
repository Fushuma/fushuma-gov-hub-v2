/**
 * Full state dump: every account, its code, and every contract storage slot,
 * at the freeze block. This is the artifact a re-launch genesis is built from.
 *
 * Requires a node with the debug namespace enabled (geth/erigon:
 * --http.api eth,net,web3,debug). A public RPC almost never exposes it, so the
 * exporter falls back to the log-replay path in accounts.ts / tokens.ts, which
 * covers balances but cannot recover arbitrary contract storage.
 *
 * TWO GETH FOOTGUNS ARE HANDLED HERE, and both silently corrupt a snapshot:
 *
 * 1. The two APIs disagree about which state they return.
 *    debug_accountRange(N)      -> state AFTER block N (it reads header.Root).
 *    debug_storageRangeAt(N, 0) -> state BEFORE block N's first transaction,
 *                                  i.e. after block N-1.
 *    So storage is read at block N+1 with txIndex 0 to line it up with the
 *    accounts. Passing txIndex = len(txs) instead does not work - geth rejects
 *    it as out of range.
 *
 * 2. Storage and account keys come back hashed. The plaintext key is only
 *    returned when the node kept the preimage, which needs --cache.preimages
 *    from the start of sync. Without it the dump is unusable as a genesis
 *    alloc, so missing preimages are counted and reported loudly rather than
 *    written out as if they were fine.
 */

import { join } from 'node:path';

import { NdjsonWriter, Progress, writeJsonFile, type FileDigest } from '../lib/out';
import { RpcClient } from '../lib/rpc';
import type { SnapshotConfig } from '../lib/config';
import type { PinnedBlock } from './pin';
import {
  EMPTY_CODE_HASH,
  isAddress,
  normalizeAddress,
  toQuantity,
  trimLeadingZeros,
  type Hex,
} from '../../../src/lib/snapshot/hex';

interface DumpAccount {
  balance: string;
  nonce: number;
  root?: string;
  codeHash?: string;
  code?: string;
  address?: string;
  key?: string;
}

interface AccountRangeResult {
  root?: string;
  accounts: Record<string, DumpAccount>;
  next?: string | null;
}

interface StorageEntry {
  key: string | null;
  value: string;
}

interface StorageRangeResult {
  storage: Record<string, StorageEntry>;
  nextKey: string | null;
}

export interface StateDumpSummary {
  supported: boolean;
  reason?: string;
  accounts: number;
  contracts: number;
  eoas: number;
  totalBalanceWei: string;
  storageSlots: number;
  /** Accounts whose address preimage the node could not supply. */
  accountsMissingPreimage: number;
  /** Storage slots whose key preimage the node could not supply. */
  slotsMissingPreimage: number;
  contractsWithIncompleteStorage: string[];
  files: FileDigest[];
  genesisReady: boolean;
}

const ZERO_HASH = `0x${'0'.repeat(64)}`;
const EMPTY_STORAGE_ROOT =
  '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

export async function dumpState(
  rpc: RpcClient,
  config: SnapshotConfig,
  pinned: PinnedBlock,
  outDir: string,
): Promise<StateDumpSummary> {
  const empty: StateDumpSummary = {
    supported: false,
    accounts: 0,
    contracts: 0,
    eoas: 0,
    totalBalanceWei: '0',
    storageSlots: 0,
    accountsMissingPreimage: 0,
    slotsMissingPreimage: 0,
    contractsWithIncompleteStorage: [],
    files: [],
    genesisReady: false,
  };

  const supported = await rpc.supports('debug_accountRange', [
    toQuantity(pinned.number),
    ZERO_HASH,
    1,
    true,
    true,
    true,
  ]);

  if (!supported) {
    console.log(
      '  debug_accountRange is not available on this RPC - skipping the full state dump.\n' +
        '  Balances and protocol state are still captured, but a genesis alloc cannot be\n' +
        '  built from this snapshot. Re-run against a node started with:\n' +
        '    --http.api eth,net,web3,debug --gcmode archive --cache.preimages',
    );
    return { ...empty, reason: 'debug_accountRange unavailable' };
  }

  console.log('  debug namespace available - running full state dump');

  const accountsWriter = await NdjsonWriter.create(join(outDir, 'state', 'accounts.ndjson'));
  const progress = new Progress('state:accounts', null);

  const contracts: Array<{ address: Hex; codeHash: string }> = [];
  let totalBalance = 0n;
  let eoas = 0;
  let missingPreimage = 0;
  let cursor: string = ZERO_HASH;
  let dumpRoot: string | undefined;

  for (;;) {
    const page = await rpc.call<AccountRangeResult>('debug_accountRange', [
      toQuantity(pinned.number),
      cursor,
      config.batchSize,
      false, // nocode: we want code for the genesis alloc
      true, // nostorage: storage is paged separately, below
      true, // incompletes: include accounts with no known preimage, so counts are honest
    ]);

    if (dumpRoot === undefined) dumpRoot = page.root;

    const entries = Object.entries(page.accounts ?? {});
    if (entries.length === 0) break;

    for (const [key, account] of entries) {
      // Depending on geth version the map is keyed by address or by the hashed
      // address, with the plaintext in `address` when a preimage exists.
      const address = account.address ?? (isAddress(key) ? key : undefined);
      const codeHash = (account.codeHash ?? EMPTY_CODE_HASH).toLowerCase();
      const hasCode = codeHash !== EMPTY_CODE_HASH && codeHash !== ZERO_HASH;
      const balance = BigInt(account.balance ?? '0');

      totalBalance += balance;

      if (!address) {
        missingPreimage += 1;
        await accountsWriter.write({
          addressHash: key,
          address: null,
          balance: balance.toString(),
          nonce: account.nonce ?? 0,
          codeHash,
          storageRoot: account.root ?? null,
          incomplete: true,
        });
        continue;
      }

      const normalized = normalizeAddress(address);

      if (hasCode) {
        contracts.push({ address: normalized, codeHash });
      } else {
        eoas += 1;
      }

      await accountsWriter.write({
        address: normalized,
        balance: balance.toString(),
        nonce: account.nonce ?? 0,
        codeHash,
        code: hasCode ? (account.code ?? null) : null,
        storageRoot: account.root ?? null,
        isContract: hasCode,
        incomplete: false,
      });

      progress.advance();
    }

    if (!page.next) break;
    cursor = page.next;
  }

  progress.finish();
  const accountsFile = await accountsWriter.close();

  console.log(
    `  ${accountsFile.records.toLocaleString()} accounts ` +
      `(${eoas.toLocaleString()} EOA, ${contracts.length.toLocaleString()} contract)`,
  );

  if (dumpRoot && dumpRoot.toLowerCase() !== pinned.stateRoot.toLowerCase()) {
    throw new Error(
      `State root mismatch: the dump reports ${dumpRoot} but block ${pinned.number} ` +
        `header says ${pinned.stateRoot}. The node served state from a different block.`,
    );
  }

  const storage = await dumpAllStorage(rpc, config, pinned, outDir, contracts);

  const summary: StateDumpSummary = {
    supported: true,
    accounts: accountsFile.records,
    contracts: contracts.length,
    eoas,
    totalBalanceWei: totalBalance.toString(),
    storageSlots: storage.slots,
    accountsMissingPreimage: missingPreimage,
    slotsMissingPreimage: storage.missingPreimage,
    contractsWithIncompleteStorage: storage.incompleteContracts,
    files: [accountsFile, ...storage.files],
    genesisReady: missingPreimage === 0 && storage.missingPreimage === 0,
  };

  if (!summary.genesisReady) {
    console.warn(
      `\n  !! ${missingPreimage.toLocaleString()} accounts and ` +
        `${storage.missingPreimage.toLocaleString()} storage slots came back without a key\n` +
        '     preimage. Those entries CANNOT be written into a genesis alloc.\n' +
        '     Re-sync the export node with --cache.preimages before relying on this dump\n' +
        '     for a chain re-launch. It is still valid as a balance record.\n',
    );
  }

  const summaryFile = await writeJsonFile(join(outDir, 'state', 'summary.json'), summary);
  summary.files.push(summaryFile);

  return summary;
}

/**
 * Page every contract's storage. Reads at pinned.number + 1 with txIndex 0 -
 * see the header comment for why that is the block that lines up with the
 * account dump.
 */
async function dumpAllStorage(
  rpc: RpcClient,
  config: SnapshotConfig,
  pinned: PinnedBlock,
  outDir: string,
  contracts: ReadonlyArray<{ address: Hex; codeHash: string }>,
): Promise<{
  slots: number;
  missingPreimage: number;
  incompleteContracts: string[];
  files: FileDigest[];
}> {
  const successorHash = await successorBlockHash(rpc, pinned);

  if (!successorHash) {
    console.warn(
      '  !! Could not resolve the block after the freeze block, so contract storage\n' +
        '     cannot be read at a matching height. Skipping the storage dump.',
    );
    return { slots: 0, missingPreimage: 0, incompleteContracts: [], files: [] };
  }

  const writer = await NdjsonWriter.create(join(outDir, 'state', 'storage.ndjson'));
  const progress = new Progress('state:storage', contracts.length);

  let slots = 0;
  let missingPreimage = 0;
  const incompleteContracts: string[] = [];

  for (const contract of contracts) {
    let startKey: string | null = ZERO_HASH;
    let contractSlots = 0;
    let contractMissing = 0;

    for (;;) {
      // Annotated explicitly: startKey is fed back from result.nextKey, and
      // without the annotation TypeScript sees a circular inference.
      const result: StorageRangeResult = await rpc.call<StorageRangeResult>(
        'debug_storageRangeAt',
        [successorHash, 0, contract.address, startKey, config.batchSize],
      );

      const entries = Object.entries(result.storage ?? {});
      for (const [hashedKey, entry] of entries) {
        if (entry.key === null || entry.key === undefined) {
          contractMissing += 1;
          missingPreimage += 1;
          await writer.write({
            address: contract.address,
            slotHash: hashedKey,
            slot: null,
            value: entry.value,
            incomplete: true,
          });
        } else {
          await writer.write({
            address: contract.address,
            slot: entry.key,
            value: trimLeadingZeros(entry.value),
            incomplete: false,
          });
        }
        contractSlots += 1;
        slots += 1;
      }

      if (!result.nextKey) break;
      startKey = result.nextKey;
    }

    if (contractMissing > 0) incompleteContracts.push(contract.address);
    if (config.verbose && contractSlots > 0) {
      console.log(`    ${contract.address}: ${contractSlots.toLocaleString()} slots`);
    }

    progress.advance();
  }

  progress.finish();
  const file = await writer.close();
  console.log(`  ${slots.toLocaleString()} storage slots across ${contracts.length} contracts`);

  return { slots, missingPreimage, incompleteContracts, files: [file] };
}

async function successorBlockHash(rpc: RpcClient, pinned: PinnedBlock): Promise<Hex | null> {
  try {
    const next = await rpc.call<{ hash: Hex; parentHash: Hex } | null>('eth_getBlockByNumber', [
      toQuantity(pinned.number + 1),
      false,
    ]);
    if (!next) return null;
    if (next.parentHash.toLowerCase() !== pinned.hash.toLowerCase()) {
      throw new Error(
        `Block ${pinned.number + 1} does not build on the freeze block - the chain reorged`,
      );
    }
    return next.hash;
  } catch (error) {
    if (error instanceof Error && error.message.includes('reorged')) throw error;
    return null;
  }
}

export { EMPTY_STORAGE_ROOT };
