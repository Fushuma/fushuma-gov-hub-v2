import { randomBytes } from "crypto";
import { verifyMessage } from "viem";
import { kv } from "./kv";

const NONCE_EXPIRY_MS = 5 * 60 * 1000;

function nonceKey(address: string): string {
  return `auth:nonce:${address.toLowerCase()}`;
}

export async function generateNonce(address: string): Promise<string> {
  const nonce = randomBytes(32).toString("hex");
  await kv.set(nonceKey(address), nonce, NONCE_EXPIRY_MS);
  return nonce;
}

export async function verifyNonce(
  address: string,
  nonce: string
): Promise<boolean> {
  const stored = await kv.get(nonceKey(address));
  return stored !== null && stored === nonce;
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

export async function clearNonce(address: string): Promise<void> {
  await kv.del(nonceKey(address));
}
