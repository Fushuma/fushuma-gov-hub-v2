/**
 * Streaming output with integrity hashing.
 *
 * A whole-network dump does not fit in memory, so every large artifact is
 * written as NDJSON (one JSON object per line) as it is produced. Each file is
 * hashed while it streams, and the hashes land in manifest.json - that is what
 * turns a directory of files into something a third party can verify.
 */

import { createHash, type Hash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, type WriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { once } from 'node:events';
import { pipeline } from 'node:stream/promises';

export interface FileDigest {
  path: string;
  bytes: number;
  records: number;
  sha256: string;
}

/** JSON.stringify replacer that renders bigints as decimal strings. */
export function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function stringify(value: unknown): string {
  return JSON.stringify(value, jsonReplacer);
}

export class NdjsonWriter {
  private readonly stream: WriteStream;
  private readonly hash: Hash;
  private bytes = 0;
  private records = 0;
  private closed = false;

  private constructor(
    readonly path: string,
    stream: WriteStream,
  ) {
    this.stream = stream;
    this.hash = createHash('sha256');
  }

  /**
   * Open a writer. With `append`, an interrupted scan can be resumed without
   * losing what it already wrote - the digest is seeded from the existing
   * bytes so the final hash still covers the whole file.
   */
  static async create(
    path: string,
    options: { append?: boolean } = {},
  ): Promise<NdjsonWriter> {
    await mkdir(dirname(path), { recursive: true });

    const append = options.append === true && existsSync(path);
    const writer = new NdjsonWriter(
      path,
      createWriteStream(path, { encoding: 'utf8', flags: append ? 'a' : 'w' }),
    );

    if (append) {
      await writer.seedFromExisting();
    }

    return writer;
  }

  /** Fold already-written bytes into the digest and the byte/record counts. */
  private async seedFromExisting(): Promise<void> {
    let trailing = '';
    await pipeline(createReadStream(this.path, { encoding: 'utf8' }), async (source) => {
      for await (const piece of source) {
        const text = piece as string;
        this.hash.update(text);
        this.bytes += Buffer.byteLength(text);
        const combined = trailing + text;
        const lines = combined.split('\n');
        trailing = lines.pop() ?? '';
        this.records += lines.length;
      }
    });
  }

  /**
   * Write one record. Awaits the drain event when the OS buffer fills, so a
   * fast producer cannot grow an unbounded in-memory queue during a long dump.
   */
  async write(record: unknown): Promise<void> {
    if (this.closed) throw new Error(`Writer for ${this.path} is already closed`);

    const line = `${stringify(record)}\n`;
    this.hash.update(line);
    this.bytes += Buffer.byteLength(line);
    this.records += 1;

    if (!this.stream.write(line)) {
      await once(this.stream, 'drain');
    }
  }

  async writeAll(records: Iterable<unknown>): Promise<void> {
    for (const record of records) {
      await this.write(record);
    }
  }

  async close(): Promise<FileDigest> {
    if (!this.closed) {
      this.closed = true;
      this.stream.end();
      await once(this.stream, 'finish');
    }
    return {
      path: this.path,
      bytes: this.bytes,
      records: this.records,
      sha256: this.hash.digest('hex'),
    };
  }
}

/** Write a small JSON document, pretty-printed, and return its digest. */
export async function writeJsonFile(path: string, value: unknown): Promise<FileDigest> {
  await mkdir(dirname(path), { recursive: true });
  const body = `${JSON.stringify(value, jsonReplacer, 2)}\n`;
  await writeFile(path, body, 'utf8');
  return {
    path,
    bytes: Buffer.byteLength(body),
    records: 1,
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Human-readable byte count for progress lines. */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

/**
 * Throttled progress reporter. A whole-chain scan can run for hours, so the
 * operator needs a live rate and ETA to know whether to keep waiting.
 */
export class Progress {
  private readonly startedAt = Date.now();
  private lastPrint = 0;
  private done = 0;

  constructor(
    private readonly label: string,
    private readonly total: number | null,
    private readonly intervalMs = 5_000,
  ) {}

  advance(count = 1): void {
    this.done += count;
    const now = Date.now();
    if (now - this.lastPrint < this.intervalMs) return;
    this.lastPrint = now;
    this.print();
  }

  private print(): void {
    const elapsed = Date.now() - this.startedAt;
    const rate = this.done / Math.max(elapsed / 1000, 0.001);
    const parts = [`  [${this.label}]`, `${this.done.toLocaleString()}`];

    if (this.total !== null && this.total > 0) {
      const pct = ((this.done / this.total) * 100).toFixed(1);
      parts.push(`/ ${this.total.toLocaleString()} (${pct}%)`);
      const remaining = this.total - this.done;
      if (rate > 0 && remaining > 0) {
        parts.push(`eta ${formatDuration((remaining / rate) * 1000)}`);
      }
    }

    parts.push(`${rate.toFixed(0)}/s`, formatDuration(elapsed));
    console.log(parts.join(' '));
  }

  finish(): void {
    this.print();
  }
}

/**
 * Drop the `files` field from a step result. Digests belong in the manifest's
 * file list, not duplicated inside each step's summary.
 */
export function withoutFiles<T extends { files: unknown }>(value: T): Omit<T, 'files'> {
  const copy = { ...value } as Record<string, unknown>;
  delete copy.files;
  return copy as Omit<T, 'files'>;
}
