/**
 * The manifest: what makes a directory of files into a verifiable snapshot.
 *
 * Every artifact is listed with its SHA-256, and those hashes are folded into
 * one snapshotHash. Publish that hash - and the balance Merkle roots next to
 * it - before the fork, and anyone can re-run the export against their own
 * node and confirm they got the same chain state, byte for byte.
 */

import { relative } from 'node:path';
import { createHash } from 'node:crypto';

import { writeJsonFile, type FileDigest } from '../lib/out';
import type { SnapshotConfig } from '../lib/config';
import type { PinnedBlock } from './pin';

export interface ManifestInput {
  config: SnapshotConfig;
  pinned: PinnedBlock;
  outDir: string;
  files: FileDigest[];
  steps: Record<string, unknown>;
  warnings: string[];
  startedAt: string;
  toolVersion: string;
}

export interface Manifest {
  snapshotHash: string;
  chainId: number;
  freezeBlock: number;
  freezeBlockHash: string;
  stateRoot: string;
  freezeTimestamp: string;
  generatedAt: string;
  durationSeconds: number;
  toolVersion: string;
  rpcUrl: string;
  files: Array<{ path: string; sha256: string; bytes: number; records: number }>;
  steps: Record<string, unknown>;
  warnings: string[];
}

export async function writeManifest(input: ManifestInput): Promise<Manifest> {
  const { config, pinned, outDir, files, steps, warnings, startedAt, toolVersion } = input;

  // Paths are stored relative so the hash does not depend on where the export
  // happened to run, and sorted so file ordering cannot change the result.
  const entries = files
    .map((file) => ({
      path: relative(outDir, file.path).split('\\').join('/'),
      sha256: file.sha256,
      bytes: file.bytes,
      records: file.records,
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const rollup = createHash('sha256');
  for (const entry of entries) {
    rollup.update(`${entry.path}\n${entry.sha256}\n`);
  }

  const generatedAt = new Date().toISOString();

  const manifest: Manifest = {
    snapshotHash: rollup.digest('hex'),
    chainId: pinned.chainId,
    freezeBlock: pinned.number,
    freezeBlockHash: pinned.hash,
    stateRoot: pinned.stateRoot,
    freezeTimestamp: pinned.timestampIso,
    generatedAt,
    durationSeconds: Math.round((Date.parse(generatedAt) - Date.parse(startedAt)) / 1000),
    toolVersion,
    // Recorded for provenance. Credentials never appear here: auth is passed
    // via SNAPSHOT_RPC_HEADERS, which is deliberately not part of the manifest.
    rpcUrl: redactUrl(config.rpcUrl),
    files: entries,
    steps,
    warnings,
  };

  await writeJsonFile(`${outDir}/manifest.json`, manifest);

  // A short, quotable summary for announcements and community verification.
  await writeJsonFile(`${outDir}/SNAPSHOT.txt.json`, {
    snapshotHash: manifest.snapshotHash,
    chainId: manifest.chainId,
    freezeBlock: manifest.freezeBlock,
    freezeBlockHash: manifest.freezeBlockHash,
    stateRoot: manifest.stateRoot,
    freezeTimestamp: manifest.freezeTimestamp,
  });

  return manifest;
}

/** Strip any userinfo from the RPC URL before it is written to disk. */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url;
  }
}
