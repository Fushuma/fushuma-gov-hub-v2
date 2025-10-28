import { defineChain } from "viem";

export const etc = defineChain({
  id: 61,
  name: "Ethereum Classic",
  nativeCurrency: {
    name: "ETC",
    symbol: "ETC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://etc.rivet.link"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout.com/etc/mainnet",
    },
  },
  testnet: false,
});

