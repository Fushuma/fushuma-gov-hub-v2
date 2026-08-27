/**
 * Snapshot run configuration: CLI flags, environment, output layout.
 */

import { resolve } from 'node:path';
import 'dotenv/config';

export interface SnapshotConfig {
  rpcUrl: string;
  chainId: number;
  /** Freeze block. null means "latest minus confirmations", resolved at run time. */
  block: number | null;
  /** Blocks to stay behind the head, so a small reorg cannot invalidate the run. */
  confirmations: number;
  outDir: string;
  batchSize: number;
  concurrency: number;
  timeoutMs: number;
  maxRetries: number;
  /** eth_getLogs span per request. Public RPCs usually cap this. */
  logRange: number;
  /** Steps to run. Empty means all of them. */
  steps: string[];
  /** Skip the debug_* full-state dump even when the node supports it. */
  skipStateDump: boolean;
  /** Re-read every replayed token balance on chain instead of a sample. */
  fullVerify: boolean;
  /** Cap on balanceOf spot-checks when fullVerify is off. */
  verifySample: number;
  verbose: boolean;
  headers: Record<string, string>;
}

const DEFAULT_RPC = 'https://rpc.fushuma.com';
const DEFAULT_CHAIN_ID = 121224;

export const ALL_STEPS = [
  'pin',
  'state',
  'accounts',
  'tokens',
  'protocol',
  'manifest',
] as const;

export type StepName = (typeof ALL_STEPS)[number];

function flag(args: string[], name: string): string | undefined {
  const prefixed = `--${name}`;
  const index = args.indexOf(prefixed);
  if (index !== -1) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith(`${prefixed}=`));
  return inline ? inline.slice(prefixed.length + 1) : undefined;
}

function boolFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

function intFlag(args: string[], name: string, fallback: number): number {
  const raw = flag(args, name);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`--${name} must be a non-negative number, got "${raw}"`);
  }
  return Math.floor(parsed);
}

/**
 * Extra headers for a node behind auth, given as SNAPSHOT_RPC_HEADERS in
 * "Key: value" form, comma separated. Kept out of CLI flags so a token never
 * lands in shell history or a process list.
 */
function parseHeaders(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const headers: Record<string, string> = {};
  for (const part of raw.split(',')) {
    const separator = part.indexOf(':');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) headers[key] = value;
  }
  return headers;
}

export function loadConfig(argv: string[] = process.argv.slice(2)): SnapshotConfig {
  const blockRaw = flag(argv, 'block');
  const requestedSteps = flag(argv, 'steps');

  const steps = requestedSteps
    ? requestedSteps.split(',').map((step) => step.trim()).filter(Boolean)
    : [];

  for (const step of steps) {
    if (!(ALL_STEPS as readonly string[]).includes(step)) {
      throw new Error(`Unknown step "${step}". Valid steps: ${ALL_STEPS.join(', ')}`);
    }
  }

  const rpcUrl =
    flag(argv, 'rpc') ??
    process.env.SNAPSHOT_RPC_URL ??
    process.env.NEXT_PUBLIC_FUSHUMA_RPC_URL ??
    DEFAULT_RPC;

  const chainId = intFlag(
    argv,
    'chain-id',
    Number(process.env.NEXT_PUBLIC_FUSHUMA_CHAIN_ID ?? DEFAULT_CHAIN_ID),
  );

  return {
    rpcUrl,
    chainId,
    block: blockRaw === undefined || blockRaw === 'latest' ? null : Number(blockRaw),
    confirmations: intFlag(argv, 'confirmations', 64),
    outDir: resolve(flag(argv, 'out') ?? process.env.SNAPSHOT_OUT_DIR ?? './snapshots'),
    batchSize: intFlag(argv, 'batch-size', 100),
    concurrency: intFlag(argv, 'concurrency', 4),
    timeoutMs: intFlag(argv, 'timeout', 60_000),
    maxRetries: intFlag(argv, 'max-retries', 5),
    logRange: intFlag(argv, 'log-range', 5_000),
    steps,
    skipStateDump: boolFlag(argv, 'skip-state-dump'),
    fullVerify: boolFlag(argv, 'full-verify'),
    verifySample: intFlag(argv, 'verify-sample', 250),
    verbose: boolFlag(argv, 'verbose'),
    headers: parseHeaders(process.env.SNAPSHOT_RPC_HEADERS),
  };
}

export function shouldRun(config: SnapshotConfig, step: StepName): boolean {
  return config.steps.length === 0 || config.steps.includes(step);
}

/** snapshots/fushuma-121224-block-1234567/ */
export function runDirectory(config: SnapshotConfig, block: number): string {
  return resolve(config.outDir, `fushuma-${config.chainId}-block-${block}`);
}
