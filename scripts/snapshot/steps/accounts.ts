/**
 * Native FUMA balances at the freeze block.
 *
 * Reads balance, nonce and code for every known address at exactly one height,
 * then commits the result to a Merkle root. The root is the thing to publish
 * before the fork: it lets any holder prove their balance was captured
 * correctly without having to trust - or even download - the full export.
 */

import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { NdjsonWriter, Progress, writeJsonFile, type FileDigest } from '../lib/out';
import { RpcClient, type RpcRequest } from '../lib/rpc';
import type { SnapshotConfig } from '../lib/config';
import { blockTagFor, type PinnedBlock } from './pin';
import { buildTree, hashEntry, type MerkleEntry } from '../../../src/lib/snapshot/merkle';
import { hexToBigInt, hexToNumber, type Hex } from '../../../src/lib/snapshot/hex';
import { chunk } from '../../../src/lib/snapshot/ranges';

export interface AccountsSummary {
  addressesQueried: number;
  fundedAccounts: number;
  contracts: number;
  totalBalanceWei: string;
  totalBalanceFuma: string;
  merkleRoot: Hex;
  merkleLeaves: number;
  failedReads: number;
  files: FileDigest[];
}

const WEI_PER_FUMA = 10n ** 18n;

export async function exportAccounts(
  rpc: RpcClient,
  config: SnapshotConfig,
  pinned: PinnedBlock,
  outDir: string,
  addresses: readonly Hex[],
): Promise<AccountsSummary> {
  const tag = blockTagFor(pinned);

  const writer = await NdjsonWriter.create(join(outDir, 'accounts', 'native-balances.ndjson'));
  const progress = new Progress('accounts', addresses.length);

  const entries: MerkleEntry[] = [];
  let totalBalance = 0n;
  let contracts = 0;
  let funded = 0;
  let failedReads = 0;

  // A page of addresses becomes three RPC calls each, issued as one batch so
  // the client can pack and pipeline them.
  for (const page of chunk(addresses, Math.max(1, Math.floor(config.batchSize / 3)) * 8)) {
    const requests: RpcRequest[] = [];
    for (const address of page) {
      requests.push({ method: 'eth_getBalance', params: [address, tag] });
      requests.push({ method: 'eth_getTransactionCount', params: [address, tag] });
      requests.push({ method: 'eth_getCode', params: [address, tag] });
    }

    const results = await rpc.batch<string>(requests);

    for (let i = 0; i < page.length; i += 1) {
      const address = page[i];
      const balanceResult = results[i * 3];
      const nonceResult = results[i * 3 + 1];
      const codeResult = results[i * 3 + 2];

      if (!balanceResult?.ok || !nonceResult?.ok || !codeResult?.ok) {
        failedReads += 1;
        await writer.write({
          address,
          error:
            (!balanceResult?.ok && balanceResult?.error.message) ||
            (!nonceResult?.ok && nonceResult?.error.message) ||
            (!codeResult?.ok && codeResult?.error.message) ||
            'unknown read failure',
        });
        continue;
      }

      const balance = hexToBigInt(balanceResult.value);
      const nonce = hexToNumber(nonceResult.value);
      const code = codeResult.value ?? '0x';
      const isContract = code !== '0x' && code !== '0x0' && code.length > 2;

      if (isContract) contracts += 1;
      totalBalance += balance;

      if (balance > 0n) {
        funded += 1;
        entries.push({ address, amount: balance });
      }

      await writer.write({
        address,
        balance: balance.toString(),
        nonce,
        isContract,
        codeSize: isContract ? (code.length - 2) / 2 : 0,
      });
    }

    progress.advance(page.length);
  }

  progress.finish();
  const balancesFile = await writer.close();

  if (failedReads > 0) {
    console.warn(
      `  !! ${failedReads.toLocaleString()} addresses could not be read at the freeze block.\n` +
        '     They are recorded with an error field. Re-run the accounts step before\n' +
        '     treating this snapshot as authoritative.',
    );
  }

  // A chain with no funded accounts is not a real snapshot - fail loudly
  // rather than publishing a root over an empty set.
  if (entries.length === 0) {
    throw new Error(
      'No funded accounts were found at the freeze block. Check --rpc and the ' +
        'discovery step before continuing.',
    );
  }

  const tree = buildTree(entries);

  const proofsFile = await writeJsonFile(join(outDir, 'accounts', 'native-merkle.json'), {
    description:
      'Merkle commitment over native FUMA balances at the freeze block. ' +
      'Leaf = keccak256(keccak256(abi.encode(address, uint256 balanceWei))), ' +
      'commutative pair hashing, OpenZeppelin MerkleProof compatible.',
    block: pinned.number,
    blockHash: pinned.hash,
    root: tree.root,
    leaves: entries.length,
    totalBalanceWei: totalBalance.toString(),
  });

  // Ship a sample of proofs so operators can smoke-test a claim contract
  // against real data without regenerating the whole tree.
  const sample = entries.slice(0, Math.min(10, entries.length)).map((entry) => ({
    address: entry.address,
    amount: entry.amount.toString(),
    leaf: hashEntry(entry),
  }));

  const sampleFile = await writeJsonFile(
    join(outDir, 'accounts', 'native-merkle-sample.json'),
    { root: tree.root, sample },
  );

  console.log(
    `  ${funded.toLocaleString()} funded accounts, ` +
      `${(totalBalance / WEI_PER_FUMA).toLocaleString()} FUMA total`,
  );
  console.log(`  native balance merkle root: ${tree.root}`);

  return {
    addressesQueried: addresses.length,
    fundedAccounts: funded,
    contracts,
    totalBalanceWei: totalBalance.toString(),
    totalBalanceFuma: formatUnits(totalBalance, 18),
    merkleRoot: tree.root,
    merkleLeaves: entries.length,
    failedReads,
    files: [balancesFile, proofsFile, sampleFile],
  };
}

/** Fixed-point formatting without pulling in a bignum dependency. */
export function formatUnits(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = magnitude / base;
  const fraction = (magnitude % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/**
 * Build the native balance commitment from an existing full state dump.
 *
 * When the debug dump succeeded it already contains every account's balance at
 * the freeze block, so re-reading them over RPC would mean millions of
 * redundant calls for an answer we hold on disk. The file is streamed rather
 * than parsed whole - a whole-network dump does not fit in memory.
 */
export async function accountsFromDump(
  pinned: PinnedBlock,
  outDir: string,
): Promise<AccountsSummary> {
  const dumpPath = join(outDir, 'state', 'accounts.ndjson');

  const reader = createInterface({
    input: createReadStream(dumpPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  const entries: MerkleEntry[] = [];
  let totalBalance = 0n;
  let contracts = 0;
  let funded = 0;
  let queried = 0;
  let incomplete = 0;

  for await (const line of reader) {
    if (!line.trim()) continue;

    const record = JSON.parse(line) as {
      address: string | null;
      balance?: string;
      isContract?: boolean;
      incomplete?: boolean;
    };

    queried += 1;
    const balance = BigInt(record.balance ?? '0');
    totalBalance += balance;

    if (record.isContract) contracts += 1;

    // Accounts with no address preimage still count toward the balance total,
    // but they cannot be committed to a Merkle leaf keyed by address.
    if (!record.address || record.incomplete) {
      if (balance > 0n) incomplete += 1;
      continue;
    }

    if (balance > 0n) {
      funded += 1;
      entries.push({ address: record.address, amount: balance });
    }
  }

  if (entries.length === 0) {
    throw new Error(`No funded accounts found in ${dumpPath}`);
  }

  const tree = buildTree(entries);

  const merkleFile = await writeJsonFile(join(outDir, 'accounts', 'native-merkle.json'), {
    description:
      'Merkle commitment over native FUMA balances at the freeze block, derived from the ' +
      'full state dump. Leaf = keccak256(keccak256(abi.encode(address, uint256 balanceWei))), ' +
      'commutative pair hashing, OpenZeppelin MerkleProof compatible.',
    source: 'state/accounts.ndjson',
    block: pinned.number,
    blockHash: pinned.hash,
    root: tree.root,
    leaves: entries.length,
    totalBalanceWei: totalBalance.toString(),
    accountsWithoutPreimage: incomplete,
  });

  console.log(
    `  ${funded.toLocaleString()} funded accounts from the state dump, ` +
      `${(totalBalance / WEI_PER_FUMA).toLocaleString()} FUMA total`,
  );
  console.log(`  native balance merkle root: ${tree.root}`);

  if (incomplete > 0) {
    console.warn(
      `  !! ${incomplete.toLocaleString()} funded accounts have no address preimage and are ` +
        'excluded from the Merkle commitment.',
    );
  }

  return {
    addressesQueried: queried,
    fundedAccounts: funded,
    contracts,
    totalBalanceWei: totalBalance.toString(),
    totalBalanceFuma: formatUnits(totalBalance, 18),
    merkleRoot: tree.root,
    merkleLeaves: entries.length,
    failedReads: incomplete,
    files: [merkleFile],
  };
}
