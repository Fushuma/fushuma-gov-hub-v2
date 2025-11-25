import { concat, encodePacked, pad, Hex } from 'viem';

export interface CLPoolParameter {
  tickSpacing: number;
  hooksRegistration?: HooksRegistration;
}

export interface HooksRegistration {
  beforeInitialize?: boolean;
  afterInitialize?: boolean;
  beforeAddLiquidity?: boolean;
  afterAddLiquidity?: boolean;
  beforeRemoveLiquidity?: boolean;
  afterRemoveLiquidity?: boolean;
  beforeSwap?: boolean;
  afterSwap?: boolean;
  beforeDonate?: boolean;
  afterDonate?: boolean;
}

const HOOKS_REGISTRATION_OFFSET: Record<keyof HooksRegistration, number> = {
  beforeInitialize: 0,
  afterInitialize: 1,
  beforeAddLiquidity: 2,
  afterAddLiquidity: 3,
  beforeRemoveLiquidity: 4,
  afterRemoveLiquidity: 5,
  beforeSwap: 6,
  afterSwap: 7,
  beforeDonate: 8,
  afterDonate: 9,
};

export const encodeHooksRegistration = (hooksRegistration?: HooksRegistration): Hex => {
  let registration = 0x0000;

  if (hooksRegistration) {
    for (const key in hooksRegistration) {
      if (hooksRegistration[key as keyof HooksRegistration]) {
        // eslint-disable-next-line no-bitwise
        registration |= 1 << HOOKS_REGISTRATION_OFFSET[key as keyof HooksRegistration];
      }
    }
  }

  return `0x${registration.toString(16).padStart(4, '0')}`;
};

/**
 * Encode CL pool parameters according to PancakeSwap V4 specification
 * 
 * Parameters layout (bytes32):
 * - Bits [0-15]: hooks registration bitmap (16 bits)
 * - Bits [16-39]: tickSpacing (24 bits)
 * - Bits [40-255]: unused
 * 
 * FIXED: Hooks must come FIRST, then tickSpacing shifted left by 16 bits
 */
export const encodeCLPoolParameters = (params: CLPoolParameter): Hex => {
  // Get hooks bitmap (16 bits)
  const hooksHex = encodeHooksRegistration(params?.hooksRegistration);
  const hooksBitmap = parseInt(hooksHex, 16);
  
  // Shift tickSpacing left by 16 bits to position it at bits [16-39]
  const tickSpacingShifted = BigInt(params.tickSpacing) << 16n;
  
  // Combine: hooks in lower 16 bits, tickSpacing in bits 16-39
  const combined = tickSpacingShifted | BigInt(hooksBitmap);
  
  // Pad to 32 bytes (64 hex characters)
  return `0x${combined.toString(16).padStart(64, '0')}` as Hex;
};
