// Contract addresses and configuration for Fushuma Launchpad

export const LAUNCHPAD_PROXY_ADDRESS = '0x206236eca2dF8FB37EF1d024e1F72f4313f413E4';
export const VESTING_IMPLEMENTATION_ADDRESS = '0x0d8e696475b233193d21E565C21080EbF6A3C5DA';

export const FUSHUMA_CHAIN_ID = 121224;
export const FUSHUMA_RPC_URL = 'https://rpc.fushuma.com';

// Payment token addresses on Fushuma network
export const PAYMENT_TOKENS = {
  FUMA: '0x0000000000000000000000000000000000000000', // Native token
  USDC: '0xf8EA5627691E041dae171350E8Df13c592084848',
  USDT: '0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e',
} as const;

export type PaymentTokenSymbol = keyof typeof PAYMENT_TOKENS;

export function getPaymentTokenAddress(symbol: PaymentTokenSymbol): string {
  return PAYMENT_TOKENS[symbol];
}

export function getPaymentTokenSymbol(address: string): PaymentTokenSymbol | 'CUSTOM' {
  const entry = Object.entries(PAYMENT_TOKENS).find(
    ([_, addr]) => addr.toLowerCase() === address.toLowerCase()
  );
  return entry ? (entry[0] as PaymentTokenSymbol) : 'CUSTOM';
}
