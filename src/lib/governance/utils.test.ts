/**
 * Governance Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import { ProposalState, VoteType } from './types';
import { getProposalStateLabel, getVoteTypeLabel, formatVotingPower, parseWFUMAAmount } from './hooks';
import {
  getProposalStateColor,
  calculateVotingMultiplier,
  formatLockDuration,
  shortenAddress,
  isValidAddress,
  calculateProposalProgress,
} from './utils';

describe('Governance Hooks', () => {
  describe('getProposalStateLabel', () => {
    it('should return correct label for each state', () => {
      expect(getProposalStateLabel(ProposalState.Pending)).toBe('Pending');
      expect(getProposalStateLabel(ProposalState.Active)).toBe('Active');
      expect(getProposalStateLabel(ProposalState.Canceled)).toBe('Canceled');
      expect(getProposalStateLabel(ProposalState.Defeated)).toBe('Defeated');
      expect(getProposalStateLabel(ProposalState.Succeeded)).toBe('Succeeded');
      expect(getProposalStateLabel(ProposalState.Queued)).toBe('Queued');
      expect(getProposalStateLabel(ProposalState.Expired)).toBe('Expired');
      expect(getProposalStateLabel(ProposalState.Executed)).toBe('Executed');
    });

    it('should return Unknown for invalid state', () => {
      expect(getProposalStateLabel(99 as ProposalState)).toBe('Unknown');
    });
  });

  describe('getVoteTypeLabel', () => {
    it('should return correct label for each vote type', () => {
      expect(getVoteTypeLabel(VoteType.Against)).toBe('Against');
      expect(getVoteTypeLabel(VoteType.For)).toBe('For');
      expect(getVoteTypeLabel(VoteType.Abstain)).toBe('Abstain');
    });

    it('should return Unknown for invalid vote type', () => {
      expect(getVoteTypeLabel(99 as VoteType)).toBe('Unknown');
    });
  });

  describe('formatVotingPower', () => {
    it('should format voting power correctly', () => {
      const power = BigInt('1000000000000000000'); // 1e18 = 1 token
      expect(formatVotingPower(power)).toBe('1');
    });

    it('should format large voting power', () => {
      const power = BigInt('1000000000000000000000'); // 1000 tokens
      expect(formatVotingPower(power)).toBe('1000');
    });

    it('should format zero voting power', () => {
      expect(formatVotingPower(BigInt(0))).toBe('0');
    });
  });

  describe('parseWFUMAAmount', () => {
    it('should parse token amount to wei', () => {
      expect(parseWFUMAAmount('1')).toBe(BigInt('1000000000000000000'));
    });

    it('should parse decimal amounts', () => {
      expect(parseWFUMAAmount('0.5')).toBe(BigInt('500000000000000000'));
    });

    it('should parse large amounts', () => {
      expect(parseWFUMAAmount('1000')).toBe(BigInt('1000000000000000000000'));
    });
  });
});

describe('Governance Utils', () => {
  describe('getProposalStateColor', () => {
    it('should return appropriate colors for each state', () => {
      const activeColor = getProposalStateColor(ProposalState.Active);
      const succeededColor = getProposalStateColor(ProposalState.Succeeded);
      const defeatedColor = getProposalStateColor(ProposalState.Defeated);

      expect(activeColor).toContain('blue');
      expect(succeededColor).toContain('green');
      expect(defeatedColor).toContain('red');
    });
  });

  describe('calculateVotingMultiplier', () => {
    it('should return 1 for zero duration', () => {
      expect(calculateVotingMultiplier(0)).toBe(1);
    });

    it('should return max multiplier for max duration', () => {
      const maxDuration = 31536000; // 1 year
      expect(calculateVotingMultiplier(maxDuration)).toBe(4);
    });

    it('should scale linearly between 1 and max', () => {
      const halfDuration = 31536000 / 2;
      const multiplier = calculateVotingMultiplier(halfDuration);
      expect(multiplier).toBeCloseTo(2.5, 1);
    });
  });

  describe('formatLockDuration', () => {
    it('should format hours correctly', () => {
      expect(formatLockDuration(3600)).toBe('1 hour');
      expect(formatLockDuration(7200)).toBe('2 hours');
    });

    it('should format days correctly', () => {
      expect(formatLockDuration(86400)).toBe('1 day');
      expect(formatLockDuration(172800)).toBe('2 days');
    });

    it('should format months correctly', () => {
      expect(formatLockDuration(2592000)).toBe('1 month');
      expect(formatLockDuration(5184000)).toBe('2 months');
    });

    it('should format years correctly', () => {
      expect(formatLockDuration(31536000)).toBe('1 year');
    });
  });

  describe('shortenAddress', () => {
    it('should shorten address correctly', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      expect(shortenAddress(address as `0x${string}`)).toBe('0x1234...5678');
    });

    it('should accept custom char count', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      expect(shortenAddress(address as `0x${string}`, 6)).toBe('0x123456...345678');
    });
  });

  describe('isValidAddress', () => {
    it('should return true for valid addresses', () => {
      expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
      expect(isValidAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(isValidAddress('0x1234')).toBe(false);
      expect(isValidAddress('not-an-address')).toBe(false);
      expect(isValidAddress('')).toBe(false);
    });
  });

  describe('calculateProposalProgress', () => {
    it('should return zeros for no votes', () => {
      const progress = calculateProposalProgress(0n, 0n, 0n);
      expect(progress.for).toBe(0);
      expect(progress.against).toBe(0);
      expect(progress.abstain).toBe(0);
    });

    it('should calculate percentages correctly', () => {
      const progress = calculateProposalProgress(
        BigInt('60000000000000000000'), // 60
        BigInt('30000000000000000000'), // 30
        BigInt('10000000000000000000')  // 10
      );
      expect(progress.for).toBe(60);
      expect(progress.against).toBe(30);
      expect(progress.abstain).toBe(10);
    });

    it('should handle unequal vote distributions', () => {
      const progress = calculateProposalProgress(
        BigInt('75000000000000000000'), // 75
        BigInt('25000000000000000000'), // 25
        0n
      );
      expect(progress.for).toBe(75);
      expect(progress.against).toBe(25);
      expect(progress.abstain).toBe(0);
    });
  });
});
