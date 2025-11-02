import { formatUnits, parseUnits } from 'viem';
import type { Token } from '@pancakeswap/sdk';

/**
 * Format token amount from wei to human-readable string
 */
export function formatTokenAmount(
  amount: bigint | undefined,
  decimals: number = 18,
  displayDecimals: number = 6
): string {
  if (!amount) return '0';
  
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  
  if (num === 0) return '0';
  if (num < 0.000001) return '< 0.000001';
  
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

/**
 * Parse token amount from string to wei
 */
export function parseTokenAmount(
  amount: string,
  decimals: number = 18
): bigint {
  try {
    return parseUnits(amount, decimals);
  } catch (error) {
    return 0n;
  }
}

/**
 * Check if token is native FUMA
 */
export function isNativeToken(address: string): boolean {
  return address === '0x0000000000000000000000000000000000000000' || 
         address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
}

/**
 * Get token display name
 */
export function getTokenDisplayName(token: Token | null | undefined): string {
  if (!token) return 'Unknown';
  return token.symbol || token.name || 'Unknown';
}

/**
 * Sort tokens by address (for consistent pair ordering)
 */
export function sortTokens(tokenA: Token, tokenB: Token): [Token, Token] {
  return tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
}

/**
 * Calculate percentage of token amount
 */
export function calculatePercentage(
  amount: bigint,
  percentage: number
): bigint {
  return (amount * BigInt(Math.floor(percentage * 100))) / 10000n;
}

/**
 * Format token amount with symbol
 */
export function formatTokenWithSymbol(
  amount: bigint | undefined,
  token: Token | null | undefined,
  displayDecimals: number = 6
): string {
  if (!token) return '0';
  
  const formatted = formatTokenAmount(amount, token.decimals, displayDecimals);
  return `${formatted} ${token.symbol}`;
}

/**
 * Validate token amount input
 */
export function validateTokenAmount(
  amount: string,
  balance: bigint | undefined,
  decimals: number = 18
): { valid: boolean; error?: string } {
  if (!amount || amount === '0') {
    return { valid: false, error: 'Please enter an amount' };
  }

  try {
    const parsedAmount = parseUnits(amount, decimals);
    
    if (parsedAmount <= 0n) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (balance !== undefined && parsedAmount > balance) {
      return { valid: false, error: 'Insufficient balance' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid amount format' };
  }
}
