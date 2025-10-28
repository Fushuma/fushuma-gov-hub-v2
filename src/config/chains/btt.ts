import { defineChain } from "viem";

export const bttc = defineChain({
  id: 199,
  name: "BitTorrent Chain",
  nativeCurrency: {
    name: "BTT",
    symbol: "BTT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.bittorrentchain.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "BTTCScan",
      url: "https://bttcscan.com",
    },
  },
  testnet: false,
});

