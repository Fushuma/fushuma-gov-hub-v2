#!/usr/bin/env tsx
/**
 * Build a genesis alloc from a full state dump.
 *
 * Only needed for a RE-LAUNCH fork - one that starts a new chain seeded with
 * the old chain's state. An in-place fork (a client release that activates new
 * rules at a block) does not need this: the existing chaindata carries the
 * state forward, and the snapshot serves as the audit record.
 *
 * The output is geth's alloc format:
 *   { "0xaddr": { balance, nonce, code, storage: { slot: value } } }
 *
 * Any account or slot whose key preimage the node could not supply is REFUSED,
 * not guessed. An alloc missing storage slots would silently produce contracts
 * with the wrong internal state - balances that do not exist, owners that are
 * not owners. Better to fail here than to discover it after launch.
 *
 * Memory: only contract accounts are held in memory (they are a small subset);
 * EOAs stream straight through.
 *
 * Usage:
 *   pnpm snapshot:genesis -- --dir snapshots/fushuma-121224-block-1234567
 *   pnpm snapshot:genesis -- --dir <dir> --allow-incomplete   # audit only
 */

import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { join, resolve } from 'node:path';

import { writeJsonFile } from './lib/out';
import { toQuantity } from '../../src/lib/snapshot/hex';
import type { Manifest } from './steps/manifest';

interface AccountRecord {
  address: string | null;
  balance?: string;
  nonce?: number;
  code?: string | null;
  isContract?: boolean;
  incomplete?: boolean;
}

interface StorageRecord {
  address: string;
  slot: string | null;
  value: string;
  incomplete?: boolean;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dir = resolve(argValue(args, 'dir') ?? '.');
  const allowIncomplete = args.includes('--allow-incomplete');

  const accountsPath = join(dir, 'state', 'accounts.ndjson');
  const storagePath = join(dir, 'state', 'storage.ndjson');
  const manifestPath = join(dir, 'manifest.json');

  if (!existsSync(accountsPath)) {
    console.error(
      `No state dump at ${accountsPath}.\n` +
        'A genesis alloc can only be built from a debug_accountRange dump. Re-run the ' +
        'snapshot against a node with --http.api ...,debug --cache.preimages.',
    );
    process.exit(1);
  }

  const manifest = existsSync(manifestPath)
    ? (JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest)
    : null;

  console.log('Building genesis alloc');
  console.log(`  source ${dir}`);
  if (manifest) {
    console.log(`  block  ${manifest.freezeBlock} (${manifest.freezeBlockHash})`);
  }

  const outPath = join(dir, 'genesis-alloc.json');
  const out = createWriteStream(outPath, { encoding: 'utf8' });
  const write = async (text: string): Promise<void> => {
    if (!out.write(text)) await once(out, 'drain');
  };

  await write('{\n');

  let entriesWritten = 0;
  let skippedAccounts = 0;
  let skippedSlots = 0;
  let totalBalance = 0n;

  const writeEntry = async (
    address: string,
    body: { balance: bigint; nonce: number; code?: string | null; storage?: Map<string, string> },
  ): Promise<void> => {
    const parts: string[] = [`"balance": "${body.balance.toString()}"`];
    if (body.nonce > 0) parts.push(`"nonce": "${toQuantity(body.nonce)}"`);
    if (body.code && body.code !== '0x') parts.push(`"code": "${body.code}"`);

    if (body.storage && body.storage.size > 0) {
      const slots = [...body.storage.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
      const rendered = slots.map(([slot, value]) => `      "${slot}": "${value}"`).join(',\n');
      parts.push(`"storage": {\n${rendered}\n    }`);
    }

    await write(
      `${entriesWritten > 0 ? ',\n' : ''}  "${address}": { ${parts.join(', ')} }`,
    );
    entriesWritten += 1;
  };

  // ---- phase 1: stream accounts, hold back the contracts -----------------
  // Contracts are a small fraction of accounts, so keeping only those in
  // memory lets a multi-gigabyte dump be processed in bounded space.
  const contracts = new Map<string, { balance: bigint; nonce: number; code: string | null }>();

  const accountReader = createInterface({
    input: createReadStream(accountsPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of accountReader) {
    if (!line.trim()) continue;
    const record = JSON.parse(line) as AccountRecord;

    if (!record.address || record.incomplete) {
      skippedAccounts += 1;
      continue;
    }

    const balance = BigInt(record.balance ?? '0');
    const nonce = record.nonce ?? 0;
    totalBalance += balance;

    if (record.isContract) {
      contracts.set(record.address, { balance, nonce, code: record.code ?? null });
    } else {
      await writeEntry(record.address, { balance, nonce });
    }
  }

  console.log(
    `  ${entriesWritten.toLocaleString()} EOAs, ${contracts.size.toLocaleString()} contracts`,
  );

  // ---- phase 2: attach storage to each contract --------------------------
  const emitted = new Set<string>();

  if (existsSync(storagePath)) {
    const storageReader = createInterface({
      input: createReadStream(storagePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    let current: string | null = null;
    let slots = new Map<string, string>();

    const flush = async (): Promise<void> => {
      if (current === null) return;

      const account = contracts.get(current);
      if (account) {
        await writeEntry(current, { ...account, storage: slots });
        emitted.add(current);
      }
      current = null;
      slots = new Map();
    };

    for await (const line of storageReader) {
      if (!line.trim()) continue;
      const record = JSON.parse(line) as StorageRecord;

      if (record.address !== current) {
        await flush();

        // Rows for one contract are written contiguously by the dump. Seeing a
        // contract twice means the file was concatenated or reordered, and
        // emitting it again would produce duplicate JSON keys.
        if (emitted.has(record.address)) {
          throw new Error(
            `storage.ndjson revisits ${record.address} after its rows ended. The dump is not ` +
              'contiguous - re-run the state step rather than patching the file.',
          );
        }
        current = record.address;
      }

      if (record.incomplete || !record.slot) {
        skippedSlots += 1;
        continue;
      }

      slots.set(record.slot, record.value);
    }

    await flush();
  }

  // Contracts with code but no storage rows still need their entry.
  for (const [address, account] of contracts) {
    if (emitted.has(address)) continue;
    await writeEntry(address, account);
  }

  await write('\n}\n');
  out.end();
  await once(out, 'finish');

  const report = {
    source: dir,
    freezeBlock: manifest?.freezeBlock ?? null,
    freezeBlockHash: manifest?.freezeBlockHash ?? null,
    stateRoot: manifest?.stateRoot ?? null,
    entries: entriesWritten,
    contracts: contracts.size,
    totalBalanceWei: totalBalance.toString(),
    skippedAccountsWithoutPreimage: skippedAccounts,
    skippedSlotsWithoutPreimage: skippedSlots,
    complete: skippedAccounts === 0 && skippedSlots === 0,
  };

  await writeJsonFile(join(dir, 'genesis-alloc-report.json'), report);

  console.log(`  ${entriesWritten.toLocaleString()} alloc entries -> ${outPath}`);

  if (!report.complete) {
    console.error(
      `\n!! INCOMPLETE: ${skippedAccounts.toLocaleString()} accounts and ` +
        `${skippedSlots.toLocaleString()} storage slots were dropped because the node could\n` +
        '   not supply their key preimages. Launching a chain from this alloc would give\n' +
        '   contracts the wrong internal state.\n\n' +
        '   Fix: re-sync the export node with --cache.preimages and re-run the state step.',
    );
    if (!allowIncomplete) {
      console.error('   Pass --allow-incomplete to keep this file for auditing anyway.');
      process.exit(1);
    }
    console.error('   --allow-incomplete set: file kept. Do NOT launch a chain from it.\n');
  } else {
    console.log('\n  Complete: every account and slot carried a known preimage.');
  }

  // A genesis skeleton, so the alloc can be dropped into a real config. Fork
  // activation blocks are deliberately left for whoever runs the launch.
  const chainConfigPath = join(dir, 'genesis-template.json');
  await writeJsonFile(chainConfigPath, {
    _comment:
      'Genesis template for a Fushuma re-launch. Set the fork activation blocks for the ' +
      'target client release, then merge genesis-alloc.json into "alloc". Review every ' +
      'field before launching.',
    config: {
      chainId: manifest?.chainId ?? 121224,
      homesteadBlock: 0,
      eip150Block: 0,
      eip155Block: 0,
      eip158Block: 0,
      byzantiumBlock: 0,
      constantinopleBlock: 0,
      petersburgBlock: 0,
      istanbulBlock: 0,
      berlinBlock: 0,
      londonBlock: 0,
      shanghaiTime: 0,
      _cancunTime: 'set this when the fork enables Cancun; see docs/DEPLOYED_CONTRACTS.md',
    },
    difficulty: '0x1',
    gasLimit: toQuantity(30_000_000),
    extraData: '0x',
    alloc: '<< merge genesis-alloc.json here >>',
  });

  console.log(`  genesis template -> ${chainConfigPath}`);
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index !== -1) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.slice(name.length + 3) : undefined;
}

main().catch((error: unknown) => {
  console.error('Genesis build error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
