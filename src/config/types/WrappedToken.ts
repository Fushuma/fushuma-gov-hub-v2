import { Token } from "@fumaswap/sdk";

export class WrappedToken extends Token {
  constructor(chainId: number, address: `0x${string}`, decimals: number, symbol: string, name: string) {
    super(chainId, address, decimals, symbol, name);
  }
}

