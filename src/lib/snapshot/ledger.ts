/**
 * Reconstructs token holder balances by replaying Transfer events.
 *
 * The hard-fork snapshot needs a holder list, and there is no way to ask an
 * EVM node "who holds this token" - balances live in a mapping that cannot be
 * enumerated. So we replay every Transfer log from genesis to the freeze block
 * and rebuild the mapping ourselves.
 *
 * Replay is only trustworthy if it is checked, so every balance this produces
 * is afterwards re-read from the chain with balanceOf() at the freeze block
 * (see scripts/snapshot/steps/tokens.ts). This class tracks the invariants
 * that catch a bad replay before that check even runs.
 */

import { normalizeAddress, ZERO_ADDRESS, type Hex } from './hex';

export interface TransferRecord {
  from: string;
  to: string;
  value: bigint;
}

export interface LedgerAnomaly {
  address: Hex;
  /** Balance the replay arrived at - negative means we missed inbound transfers. */
  balance: bigint;
  reason: 'negative-balance';
}

export interface LedgerSummary {
  holders: number;
  transfers: number;
  totalMinted: bigint;
  totalBurned: bigint;
  /** minted - burned. Should equal the contract's totalSupply() at the freeze block. */
  derivedSupply: bigint;
  sumOfBalances: bigint;
  anomalies: LedgerAnomaly[];
}

/**
 * Addresses that are treated as mint/burn sinks rather than holders. The zero
 * address is universal; 0x...dEaD is a convention many tokens use for burns.
 * Both are still reported, they are just excluded from the holder set.
 */
export const BURN_ADDRESSES: readonly Hex[] = [
  ZERO_ADDRESS,
  '0x000000000000000000000000000000000000dead',
];

export class BalanceLedger {
  private readonly balances = new Map<Hex, bigint>();
  private readonly burnSet: Set<Hex>;

  private transfers = 0n;
  private minted = 0n;
  private burned = 0n;

  constructor(burnAddresses: readonly Hex[] = BURN_ADDRESSES) {
    this.burnSet = new Set(burnAddresses.map((a) => normalizeAddress(a)));
  }

  /**
   * Apply one Transfer. Mints (from == 0x0) add supply without debiting, burns
   * (to is a burn sink) remove it without crediting. A self-transfer nets to
   * zero, which falls out of the debit-then-credit order naturally.
   */
  applyTransfer(record: TransferRecord): void {
    const from = normalizeAddress(record.from);
    const to = normalizeAddress(record.to);
    const value = record.value;

    if (value < 0n) {
      throw new Error(`Transfer value must be non-negative, got ${value}`);
    }

    this.transfers += 1n;

    if (from === ZERO_ADDRESS) {
      this.minted += value;
    } else {
      this.credit(from, -value);
    }

    if (this.burnSet.has(to)) {
      this.burned += value;
      // A burn to a non-zero sink still lands in that account's balance on
      // chain, so keep crediting it - it is excluded from holders() instead.
      if (to !== ZERO_ADDRESS) this.credit(to, value);
    } else {
      this.credit(to, value);
    }
  }

  private credit(address: Hex, delta: bigint): void {
    const next = (this.balances.get(address) ?? 0n) + delta;
    if (next === 0n) {
      this.balances.delete(address);
    } else {
      this.balances.set(address, next);
    }
  }

  balanceOf(address: string): bigint {
    return this.balances.get(normalizeAddress(address)) ?? 0n;
  }

  /**
   * Non-zero, non-burn balances, sorted by address so the output file is
   * deterministic across runs.
   */
  holders(): Array<{ address: Hex; balance: bigint }> {
    const out: Array<{ address: Hex; balance: bigint }> = [];
    for (const [address, balance] of this.balances) {
      if (balance <= 0n) continue;
      if (this.burnSet.has(address)) continue;
      out.push({ address, balance });
    }
    out.sort((a, b) => (a.address < b.address ? -1 : a.address > b.address ? 1 : 0));
    return out;
  }

  summary(): LedgerSummary {
    const anomalies: LedgerAnomaly[] = [];
    let sum = 0n;

    for (const [address, balance] of this.balances) {
      if (balance < 0n) {
        anomalies.push({ address, balance, reason: 'negative-balance' });
      }
      if (this.burnSet.has(address)) continue;
      if (balance > 0n) sum += balance;
    }

    anomalies.sort((a, b) => (a.address < b.address ? -1 : 1));

    return {
      holders: this.holders().length,
      transfers: Number(this.transfers),
      totalMinted: this.minted,
      totalBurned: this.burned,
      derivedSupply: this.minted - this.burned,
      sumOfBalances: sum,
      anomalies,
    };
  }
}
