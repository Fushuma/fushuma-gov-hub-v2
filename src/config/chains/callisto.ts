import { defineChain } from "viem";

export const callisto = defineChain({
  id: 820,
  name: "Callisto Network",
  nativeCurrency: {
    name: "CLO",
    symbol: "CLO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.callisto.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Callisto Explorer",
      url: "https://explorer.callisto.network",
    },
  },
  testnet: false,
});

