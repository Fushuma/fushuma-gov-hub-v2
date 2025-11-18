/**
 * Pool Key Helper Utilities
 * 
 * Utilities for correctly encoding PoolKey parameters field
 * according to PancakeSwap V4 specification
 */

import { FeeAmount, TICK_SPACINGS } from './contracts';

/**
 * Encode tick spacing into the parameters field
 * 
 * The parameters field is a bytes32 value with the following structure:
 * - Bits [0-15]: Reserved for hooks registration bitmap
 * - Bits [16-39]: Tick spacing (24 bits)
 * - Bits [40-255]: Unused
 * 
 * @param tickSpacing The tick spacing value (1-32767)
 * @param hooksBitmap Optional hooks registration bitmap (default: 0)
 * @returns Correctly encoded bytes32 parameters value
 */
export function encodePoolParameters(
  tickSpacing: number,
  hooksBitmap: number = 0
): `0x${string}` {
  // Validate tick spacing
  if (tickSpacing < 1 || tickSpacing > 32767) {
    throw new Error(`Invalid tick spacing: ${tickSpacing}. Must be between 1 and 32767.`);
  }
  
  // Encode: hooksBitmap in bits [0-15], tickSpacing in bits [16-39]
  // tickSpacing needs to be shifted left by 16 bits
  const tickSpacingShifted = BigInt(tickSpacing) << 16n;
  const hooksBitmapMasked = BigInt(hooksBitmap) & 0xFFFFn; // Only lower 16 bits
  
  const parameters = tickSpacingShifted | hooksBitmapMasked;
  
  return `0x${parameters.toString(16).padStart(64, '0')}` as `0x${string}`;
}

/**
 * Get the correct parameters value for a given fee tier
 * 
 * @param fee The fee tier (e.g., FeeAmount.MEDIUM)
 * @returns Correctly encoded bytes32 parameters value
 */
export function getParametersForFee(fee: FeeAmount): `0x${string}` {
  const tickSpacing = TICK_SPACINGS[fee];
  
  if (!tickSpacing) {
    throw new Error(`No tick spacing configured for fee tier: ${fee}`);
  }
  
  return encodePoolParameters(tickSpacing);
}

/**
 * Decode tick spacing from parameters field
 * 
 * @param parameters The bytes32 parameters value
 * @returns The tick spacing value
 */
export function decodeTickSpacing(parameters: `0x${string}`): number {
  const value = BigInt(parameters);
  // Extract bits [16-39] by shifting right 16 bits and masking to 24 bits
  const tickSpacing = Number((value >> 16n) & 0xFFFFFFn);
  return tickSpacing;
}

/**
 * Decode hooks bitmap from parameters field
 * 
 * @param parameters The bytes32 parameters value
 * @returns The hooks bitmap value
 */
export function decodeHooksBitmap(parameters: `0x${string}`): number {
  const value = BigInt(parameters);
  // Extract bits [0-15]
  const hooksBitmap = Number(value & 0xFFFFn);
  return hooksBitmap;
}
