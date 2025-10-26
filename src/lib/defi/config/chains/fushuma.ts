import { defineChain } from "viem";

export const fushuma = defineChain({
  id: 121224,
  name: 'Fushuma',
  network: 'fushuma',
  nativeCurrency: {
    decimals: 18,
    name: 'Fushuma',
    symbol: 'FUMA',
  },
  rpcUrls: {
    public: { http: ['https://rpc.fushuma.com'] },
    default: { http: ['https://rpc.fushuma.com'] },
  },
  blockExplorers: {
    default: { name: 'FumaScan', url: 'https://fumascan.com' },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11' // Standard multicall3 address
    },
  },
  testnet: false,
});

