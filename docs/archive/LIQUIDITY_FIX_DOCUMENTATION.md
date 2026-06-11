# FumaSwap Liquidity Addition - Fixes and Known Issues

## Date: November 22, 2025

## Summary

This document details the fixes applied to resolve the "Calculated liquidity is zero" error when adding liquidity to FumaSwap V4 pools, and documents the remaining pool ID encoding issue that needs to be resolved.

---

## Issues Fixed ✅

### 1. Token Sorting Bug (CRITICAL)

**Problem:** Tokens were sorted by address for the pool key, but the amounts were NOT swapped to match the sorted order.

**Impact:** When adding liquidity to USDT/WFUMA pool:
- USDT address (0x1e11...) < WFUMA address (0xBcA7...)
- Pool key correctly used: currency0=USDT, currency1=WFUMA
- BUT amounts were: amount0=667 WFUMA, amount1=1 USDT (WRONG!)
- This caused USDT's small amount (10^6) to be used in WFUMA's liquidity calculation
- Result: Arithmetic underflow → liquidity = 0

**Fix Applied:**
```typescript
// Before (BUGGY):
const poolKey: PoolKey = {
  currency0: token0.address,  // Not sorted!
  currency1: token1.address,  // Not sorted!
  ...
};

// After (FIXED):
const tokensAlreadySorted = token0.address.toLowerCase() < token1.address.toLowerCase();
const currency0 = tokensAlreadySorted ? token0.address : token1.address;
const currency1 = tokensAlreadySorted ? token1.address : token0.address;

// CRITICAL: Also swap amounts to match sorted token order
const amount0 = tokensAlreadySorted ? amount0Desired : amount1Desired;
const amount1 = tokensAlreadySorted ? amount1Desired : amount0Desired;

const poolKey: PoolKey = {
  currency0,
  currency1,
  ...
};

// Use sorted amounts in liquidity calculation
const liquidity = maxLiquidityForAmounts(
  sqrtPriceX96,
  sqrtRatioAX96,
  sqrtRatioBX96,
  amount0,  // Sorted amount
  amount1   // Sorted amount
);
```

**Files Modified:**
- `src/lib/fumaswap/liquidity.ts` (lines 110-140, 200-210)

---

### 2. Comprehensive Logging Added

**Purpose:** Enable debugging of the entire liquidity addition flow.

**Logs Added:**
```
🔢 [STEP 1] Starting addLiquidity...
  Token0: WFUMA 0x... decimals: 18
  Token1: USDT 0x... decimals: 6
  Amount0Desired: 667000000000000000000
  Amount1Desired: 1000000
  TickLower: -887270
  TickUpper: 887270

🔄 Token sorting:
  Already sorted? false
  Currency0 (sorted): 0x1e11... (USDT)
  Currency1 (sorted): 0xBcA7... (WFUMA)
  Amount0 (sorted): 1000000
  Amount1 (sorted): 667000000000000000000

📊 [STEP 2] Pool ID: 0x...

📞 [STEP 3] Fetching pool state from CLPoolManager...

✅ [STEP 4] Pool state fetched:
  sqrtPriceX96: ...
  currentTick: ...

✅ [STEP 5] Calculated liquidity: ...

📝 [STEP 6] Creating transaction with liquidity: ...

🚀 [STEP 7] Calling writeContract...
```

**Implementation:** All logs use `console.error()` to prevent tree-shaking in production builds.

**Files Modified:**
- `src/lib/fumaswap/liquidity.ts` (throughout)

---

### 3. USDT as Default Token

**Change:** Modified token list order to show USDT first instead of USDC.

**Purpose:** Easier testing and better UX for USDT/WFUMA pool.

**Files Modified:**
- `src/lib/fumaswap/tokens.ts`

---

## Remaining Issues ❌

### Pool ID Encoding Mismatch (CRITICAL)

**Problem:** The frontend calculates a different pool ID than the contract expects.

**Root Cause:** Mismatch between how the frontend encodes the pool key and how the Solidity contract calculates the pool ID.

**Contract Implementation (Solidity):**
```solidity
// src/infinity-core/types/PoolId.sol
function toId(PoolKey memory poolKey) internal pure returns (PoolId poolId) {
    assembly ("memory-safe") {
        // 0xc0 = 192 bytes = 6 slots × 32 bytes
        poolId := keccak256(poolKey, 0xc0)
    }
}
```

**Frontend Implementation (TypeScript):**
```typescript
// Current implementation (INCORRECT):
function getPoolId(poolKey: PoolKey): `0x${string}` {
  const encodedParams = encodeCLPoolParameters(poolKey.parameters);
  const { encodeAbiParameters } = require('viem');
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint24' },
        { type: 'bytes32' },
      ],
      [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.hooks,
        poolKey.poolManager,
        poolKey.fee,
        encodedParams,
      ]
    )
  );
}
```

**Evidence:**
- Frontend calculates: `0x668d8da76e4b4db84feff9cd46478e79d57fc980cbae96887a3388a2b2047103`
- Contract expects: `0x5cf5c1b7a0b0a9b7f18a1de399cbf2a7b9c92a8c042244f611e70b268b1d671d`
- Result: Pool appears uninitialized (sqrtPriceX96 = 0) even after initialization

**Impact:**
- Cannot add liquidity because frontend queries wrong pool
- Pool initialization succeeds but frontend can't find it

**Attempted Fixes:**
1. ❌ Used `encodePacked` instead of `encodeAbiParameters` - Wrong pool ID
2. ❌ Used ethers `AbiCoder.defaultAbiCoder().encode()` - Different pool ID
3. ❌ Matched `encodeCLPoolParameters` encoding - Still mismatched

**Next Steps:**
1. Study PancakeSwap V4 SDK implementation of pool ID calculation
2. Compare byte-by-byte encoding of pool key in frontend vs contract
3. Consider using a view function on the contract to calculate pool ID
4. OR: Modify contract to accept frontend's pool ID calculation method

**Workaround:**
Initialize pools manually using the script `init_frontend_pool.js` with the exact encoding the frontend uses.

---

## Pool Initialization

**Status:** Pool has been initialized with correct parameters.

**Transaction:** `0xa1add0b62265f18215ddc2808112f0fbe48eb83496456ee3b7e24d13b8f85f7d`

**Pool Parameters:**
- Currency0: USDT (0x1e11d176117dbEDbd234b1c6a10C6eb8dceD275e)
- Currency1: WFUMA (0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E)
- Fee: 0.30% (3000)
- Tick Spacing: 60
- Initial Price: 667 WFUMA = 1 USDT
- sqrtPriceX96: 3067726703850142826496

**Pool ID (ABI encoded):** `0x5cf5c1b7a0b0a9b7f18a1de399cbf2a7b9c92a8c042244f611e70b268b1d671d`

---

## Testing

### How to Test:

1. **Clear browser cache completely**
2. **Open DevTools Console**
3. **Navigate to:** https://governance2.fushuma.com/defi/fumaswap/liquidity
4. **Select tokens:** USDT (should be default) and WFUMA
5. **Enter amounts:** 1 USDT and 667 WFUMA
6. **Click "Add Liquidity"**
7. **Check console logs** for the 7-step flow

### Expected Behavior (After Pool ID Fix):

```
✅ [STEP 1] Token information logged
✅ [STEP 2] Pool ID matches initialized pool
✅ [STEP 3] Pool state fetch succeeds
✅ [STEP 4] sqrtPriceX96 is NON-ZERO
✅ [STEP 5] Calculated liquidity is LARGE (not 0)
✅ [STEP 6] Transaction created
✅ [STEP 7] MetaMask popup appears
```

### Current Behavior (Pool ID Mismatch):

```
✅ [STEP 1-3] All correct
❌ [STEP 4] sqrtPriceX96 = 0 (wrong pool)
❌ [STEP 5] Calculated liquidity = 0
❌ Error: "Calculated liquidity is zero"
```

---

## Files Changed

### Modified:
1. `src/lib/fumaswap/liquidity.ts` - Token sorting fix + comprehensive logging
2. `src/lib/fumaswap/tokens.ts` - USDT as default token
3. `src/components/defi/SwapWidget.tsx` - (Minor changes)
4. `src/lib/fumaswap/staticPools.ts` - (Minor changes)
5. `src/lib/fumaswap/swap.ts` - (Minor changes)

### New Files:
- `init_frontend_pool.js` - Pool initialization script (server-side)
- `check_pool_state.js` - Pool state verification script (server-side)

---

## References

- **PancakeSwap V4 Documentation:** https://docs.pancakeswap.finance/
- **Uniswap V4 Liquidity Math:** https://github.com/Uniswap/v4-core
- **Issue Document:** `PancakeSwapV4ShanghaiEVMIssues.docx`

---

## Next Actions

### Immediate (Required):
1. ✅ Commit token sorting fix
2. ✅ Commit comprehensive logging
3. ❌ Fix pool ID encoding mismatch

### Future (Nice to Have):
1. Add Permit2 approval flow
2. Add pool initialization UI
3. Add liquidity preview/simulation
4. Add slippage protection settings

---

## Contact

For questions or issues, please contact the Fushuma development team.

**Last Updated:** November 22, 2025
