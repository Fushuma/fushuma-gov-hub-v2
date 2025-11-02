/**
 * Bridge Helper Utilities
 * Ported and adapted from Bridge application
 */

import { parseUnits, formatUnits } from 'viem';
import type { BridgeToken } from '../constants/bridgeTokens';

/**
 * Get decimal amount for token
 */
export function getDecimalAmount(amount: string | number, decimals: number): bigint {
  try {
    return parseUnits(amount.toString(), decimals);
  } catch (error) {
    console.error('Error parsing decimal amount:', error);
    return 0n;
  }
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  try {
    return formatUnits(amount, decimals);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
}

/**
 * Check if amount is zero
 */
export function isZero(value: string | number | bigint): boolean {
  if (typeof value === 'bigint') {
    return value === 0n;
  }
  if (typeof value === 'number') {
    return value === 0;
  }
  return value === '0' || value === '' || parseFloat(value) === 0;
}

/**
 * Validate bridge amount
 */
export function validateBridgeAmount(
  amount: string,
  balance: string,
  minAmount: string = '0'
): { valid: boolean; error?: string } {
  if (!amount || isZero(amount)) {
    return { valid: false, error: 'Please enter an amount' };
  }

  const amountNum = parseFloat(amount);
  const balanceNum = parseFloat(balance);
  const minAmountNum = parseFloat(minAmount);

  if (isNaN(amountNum) || amountNum <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }

  if (amountNum < minAmountNum) {
    return { valid: false, error: `Minimum amount is ${minAmount}` };
  }

  if (amountNum > balanceNum) {
    return { valid: false, error: 'Insufficient balance' };
  }

  return { valid: true };
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!isValidAddress(address)) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
}

/**
 * Get transaction explorer URL
 */
export function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: { [key: number]: string } = {
    1: 'https://etherscan.io',
    56: 'https://bscscan.com',
    137: 'https://polygonscan.com',
    121224: 'https://fumascan.com',
    42161: 'https://arbiscan.io',
    8453: 'https://basescan.org',
    130: 'https://hecoinfo.com',
    820: 'https://explorer.callisto.network'
  };

  const baseUrl = explorers[chainId] || 'https://etherscan.io';
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get address explorer URL
 */
export function getAddressExplorerUrl(chainId: number, address: string): string {
  const explorers: { [key: number]: string } = {
    1: 'https://etherscan.io',
    56: 'https://bscscan.com',
    137: 'https://polygonscan.com',
    121224: 'https://fumascan.com',
    42161: 'https://arbiscan.io',
    8453: 'https://basescan.org',
    130: 'https://hecoinfo.com',
    820: 'https://explorer.callisto.network'
  };

  const baseUrl = explorers[chainId] || 'https://etherscan.io';
  return `${baseUrl}/address/${address}`;
}

/**
 * Calculate estimated gas cost
 */
export function estimateGasCost(gasLimit: bigint, gasPrice: bigint): bigint {
  return gasLimit * gasPrice;
}

/**
 * Format gas cost for display
 */
export function formatGasCost(gasCost: bigint, decimals: number = 18): string {
  return formatTokenAmount(gasCost, decimals);
}

/**
 * Generate unique transaction ID
 */
export function generateTransactionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get token display name
 */
export function getTokenDisplayName(token: BridgeToken): string {
  return `${token.symbol} - ${token.name}`;
}

/**
 * Calculate bridge fee (if applicable)
 */
export function calculateBridgeFee(amount: bigint, feePercentage: number = 0): bigint {
  if (feePercentage === 0) return 0n;
  return (amount * BigInt(Math.floor(feePercentage * 100))) / 10000n;
}

/**
 * Get amount after fee
 */
export function getAmountAfterFee(amount: bigint, feePercentage: number = 0): bigint {
  const fee = calculateBridgeFee(amount, feePercentage);
  return amount - fee;
}

/**
 * Format time ago
 */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Wait for specified milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await wait(delay);
      }
    }
  }
  
  throw lastError;
}
