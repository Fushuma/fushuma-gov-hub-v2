import type { Address, Hex } from 'viem';

export interface CLPoolParameter {
  tickSpacing: number;
  hooksRegistration?: Record<string, boolean>;
}

// Decoded PoolKey with parameters as object
export interface PoolKey {
  currency0: Address;
  currency1: Address;
  hooks: Address;
  poolManager: Address;
  fee: number;
  parameters: CLPoolParameter;
}

// Encoded PoolKey with parameters as Bytes32
export interface EncodedPoolKey {
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

export interface EncodedCLPositionConfig {
  poolKey: EncodedPoolKey;
  tickLower: number;
  tickUpper: number;
}
