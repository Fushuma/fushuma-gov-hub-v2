import type { Address, Hex } from 'viem';

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  hooks: Address;
  poolManager: Address;
  fee: number;
  parameters: Hex;
}

export interface CLPositionConfig {
  poolKey: PoolKey;
  tickLower: number;
  tickUpper: number;
}
