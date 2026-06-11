/**
 * Permit2 (AllowanceTransfer) helpers.
 *
 * The Infinity periphery pulls input tokens with
 * `permit2.transferFrom(payer, vault, ...)`, so swapping requires:
 *   1. a one-time ERC20 approval of the Permit2 contract, and
 *   2. a Permit2 allowance for the router (token, spender, amount, expiration).
 * Approving the router directly at the ERC20 level does nothing.
 */

export const PERMIT2_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
      { name: 'nonce', type: 'uint48' },
    ],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
    ],
    outputs: [],
  },
] as const;

/** Default Permit2 allowance lifetime: 30 days. */
export const PERMIT2_EXPIRATION_SECONDS = 30 * 24 * 60 * 60;

export function permit2AllowanceExpiration(): number {
  return Math.floor(Date.now() / 1000) + PERMIT2_EXPIRATION_SECONDS;
}
