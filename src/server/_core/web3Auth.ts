import { randomBytes } from "crypto";
import { verifyMessage } from "viem";

const nonceStore = new Map<string, { nonce: string; timestamp: number }>();
const NONCE_EXPIRY = 5 * 60 * 1000;

export function generateNonce(address: string): string {
  const nonce = randomBytes(32).toString("hex");
  nonceStore.set(address.toLowerCase(), { nonce, timestamp: Date.now() });
  for (const [addr, data] of nonceStore.entries()) {
    if (Date.now() - data.timestamp > NONCE_EXPIRY) {
      nonceStore.delete(addr);
    }
  }
  return nonce;
}

export function verifyNonce(address: string, nonce: string): boolean {
  const stored = nonceStore.get(address.toLowerCase());
  if (stored === undefined) return false;
  if (Date.now() - stored.timestamp > NONCE_EXPIRY) {
    nonceStore.delete(address.toLowerCase());
    return false;
  }
  return stored.nonce === nonce;
}

export function generateSignInMessage(address: string, nonce: string): string {
  return `Welcome to Fushuma Governance Hub!

Sign this message to authenticate your wallet.

Wallet: ${address}
Nonce: ${nonce}

This request will not trigger a blockchain transaction or cost any gas fees.`;
}

export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    return await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function clearNonce(address: string): void {
  nonceStore.delete(address.toLowerCase());
}
