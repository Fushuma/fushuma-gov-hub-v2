import { defineChain } from "viem";

export const fushuma = defineChain({
  id: 121224,
  name: "Fushuma Network",
  nativeCurrency: {
    name: "FUMA",
    symbol: "FUMA",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.fushuma.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Fushuma Explorer",
      url: "https://explorer.fushuma.network",
    },
  },
  testnet: false,
});

