/**
 * Batching JSON-RPC client for the hard-fork snapshot exporter.
 *
 * Fushuma has no Multicall3 deployment (see src/server/services/voting-power.ts),
 * so a snapshot of tens of thousands of accounts means tens of thousands of
 * individual eth_call / eth_getBalance requests. Doing those one at a time
 * would take hours. This client packs them into JSON-RPC batch arrays and runs
 * several batches concurrently, while degrading gracefully when the node
 * pushes back.
 */

import { setTimeout as sleep } from 'node:timers/promises';

export interface RpcRequest {
  method: string;
  params: unknown[];
}

export type RpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RpcError };

export class RpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

export interface RpcClientOptions {
  url: string;
  /** Requests per JSON-RPC batch array. Reduced automatically on 413s. */
  batchSize?: number;
  /** Batch arrays in flight at once. */
  concurrency?: number;
  timeoutMs?: number;
  maxRetries?: number;
  /** Extra headers, e.g. an API key for a private archive node. */
  headers?: Record<string, string>;
  verbose?: boolean;
}

interface JsonRpcResponse {
  id?: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/** JSON-RPC codes that mean "slow down" rather than "this call is invalid". */
const RETRYABLE_RPC_CODES = new Set([-32005, -32603, -32000]);
const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Transient RPC-level errors worth retrying, matched on message text. */
const RETRYABLE_MESSAGES = [
  'timeout',
  'rate limit',
  'too many requests',
  'temporarily unavailable',
  'try again',
  'busy',
  'connection reset',
];

class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
  }

  release(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next();
  }
}

export class RpcClient {
  readonly url: string;
  private batchSize: number;
  private readonly semaphore: Semaphore;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly headers: Record<string, string>;
  private readonly verbose: boolean;
  private nextId = 1;

  readonly stats = { requests: 0, batches: 0, retries: 0, failures: 0 };

  constructor(options: RpcClientOptions) {
    this.url = options.url;
    this.batchSize = options.batchSize ?? 100;
    this.semaphore = new Semaphore(options.concurrency ?? 4);
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxRetries = options.maxRetries ?? 5;
    this.headers = options.headers ?? {};
    this.verbose = options.verbose ?? false;
  }

  /** Single call. Throws on RPC or transport error. */
  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const [result] = await this.batch<T>([{ method, params }]);
    if (!result.ok) throw result.error;
    return result.value;
  }

  /**
   * Batch of calls. Per-call errors are returned, not thrown, because several
   * snapshot steps expect specific calls to revert - ownerOf() on a burned
   * veNFT, or a view function a proxy has not been upgraded to yet. Those must
   * not abort a multi-hour export.
   */
  async batch<T>(requests: readonly RpcRequest[]): Promise<Array<RpcResult<T>>> {
    if (requests.length === 0) return [];

    const results: Array<RpcResult<T>> = new Array(requests.length);
    const chunks: Array<{ offset: number; items: RpcRequest[] }> = [];

    for (let i = 0; i < requests.length; i += this.batchSize) {
      chunks.push({ offset: i, items: requests.slice(i, i + this.batchSize) });
    }

    await Promise.all(
      chunks.map(async ({ offset, items }) => {
        const chunkResults = await this.sendWithRetry<T>(items);
        chunkResults.forEach((result, i) => {
          results[offset + i] = result;
        });
      }),
    );

    return results;
  }

  /** Batch where any per-call error is fatal. */
  async batchOrThrow<T>(requests: readonly RpcRequest[]): Promise<T[]> {
    const results = await this.batch<T>(requests);
    return results.map((result, i) => {
      if (!result.ok) {
        throw new RpcError(
          `${requests[i].method}(${JSON.stringify(requests[i].params)}) failed: ${result.error.message}`,
          result.error.code,
          result.error.data,
        );
      }
      return result.value;
    });
  }

  /**
   * Probe whether the node exposes a method. Used to pick between the fast
   * debug_* state dump and the slow log-replay fallback.
   */
  async supports(method: string, params: unknown[] = []): Promise<boolean> {
    try {
      await this.call(method, params);
      return true;
    } catch (error) {
      if (error instanceof RpcError) {
        const message = error.message.toLowerCase();
        // "method not found" / "does not exist" / "not available" mean absent.
        // Anything else (bad params, out of range) means the method is there.
        return !(
          error.code === -32601 ||
          message.includes('method not found') ||
          message.includes('does not exist') ||
          message.includes('not available') ||
          message.includes('unsupported method')
        );
      }
      return false;
    }
  }

  private async sendWithRetry<T>(requests: RpcRequest[]): Promise<Array<RpcResult<T>>> {
    let attempt = 0;

    for (;;) {
      try {
        return await this.send<T>(requests);
      } catch (error) {
        const retryable = this.isRetryable(error);

        if (!retryable || attempt >= this.maxRetries) {
          this.stats.failures += 1;
          const message = error instanceof Error ? error.message : String(error);
          const rpcError = new RpcError(
            `Batch of ${requests.length} failed after ${attempt} retries: ${message}`,
          );
          // Surface the failure per-call so one bad batch degrades the run
          // instead of ending it. Callers decide what a gap means for them.
          return requests.map(() => ({ ok: false as const, error: rpcError }));
        }

        // A payload the node considers oversized is not going to succeed on a
        // retry at the same size - shrink for the rest of the run.
        if (this.isOversized(error) && this.batchSize > 1) {
          this.batchSize = Math.max(1, Math.floor(this.batchSize / 2));
          if (this.verbose) {
            console.warn(`  [rpc] node rejected batch size, reducing to ${this.batchSize}`);
          }
        }

        attempt += 1;
        this.stats.retries += 1;
        const backoff = Math.min(2 ** attempt * 500, 16_000);
        const jitter = Math.floor(backoff * 0.25 * ((attempt * 7919) % 100) / 100);
        await sleep(backoff + jitter);
      }
    }
  }

  private async send<T>(requests: RpcRequest[]): Promise<Array<RpcResult<T>>> {
    await this.semaphore.acquire();
    try {
      const payload = requests.map((request) => ({
        jsonrpc: '2.0' as const,
        id: this.nextId++,
        method: request.method,
        params: request.params,
      }));

      this.stats.batches += 1;
      this.stats.requests += requests.length;

      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...this.headers },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw new HttpError(response.status, (await response.text()).slice(0, 500));
      }

      const body = (await response.json()) as JsonRpcResponse | JsonRpcResponse[];

      // A node that rejects the whole batch replies with a single error object.
      if (!Array.isArray(body)) {
        if (body.error) {
          throw new RpcError(body.error.message, body.error.code, body.error.data);
        }
        throw new RpcError('Expected a JSON-RPC batch response, got a single object');
      }

      // Batch responses may come back in any order, so match on id.
      const byId = new Map<number, JsonRpcResponse>();
      for (const entry of body) {
        if (typeof entry.id === 'number') byId.set(entry.id, entry);
      }

      return payload.map((request): RpcResult<T> => {
        const entry = byId.get(request.id);
        if (!entry) {
          return {
            ok: false,
            error: new RpcError(`No response for ${request.method} (id ${request.id})`),
          };
        }
        if (entry.error) {
          return {
            ok: false,
            error: new RpcError(entry.error.message, entry.error.code, entry.error.data),
          };
        }
        return { ok: true, value: entry.result as T };
      });
    } finally {
      this.semaphore.release();
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof HttpError) return RETRYABLE_HTTP.has(error.status) || error.status === 413;
    if (error instanceof RpcError) {
      if (error.code !== undefined && RETRYABLE_RPC_CODES.has(error.code)) return true;
      const message = error.message.toLowerCase();
      return RETRYABLE_MESSAGES.some((needle) => message.includes(needle));
    }
    // Transport-level: fetch throws TypeError on network failure, and
    // AbortError/TimeoutError when our own deadline fires.
    return error instanceof Error;
  }

  private isOversized(error: unknown): boolean {
    if (error instanceof HttpError) return error.status === 413;
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('too large') ||
        message.includes('batch too') ||
        message.includes('payload') ||
        message.includes('exceeds')
      );
    }
    return false;
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`HTTP ${status}: ${body}`);
    this.name = 'HttpError';
  }
}
