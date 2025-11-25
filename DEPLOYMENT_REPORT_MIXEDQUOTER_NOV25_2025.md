# MixedQuoter Redeployment Report

**Date:** November 25, 2025
**Network:** Fushuma (Chain ID: 121224)
**Contract:** MixedQuoter

---

## Deployment Summary

The MixedQuoter contract has been successfully redeployed to the Fushuma network from commit `6f04efd` which includes critical fixes for Shanghai EVM compatibility.

---

## Deployment Details

| Parameter | Value |
|-----------|-------|
| **Contract Name** | MixedQuoter |
| **Contract Address** | `0x0Ea2c4B7990EB44f2E9a106b159C165e702dF98d` |
| **Transaction Hash** | `0xb9ddf8be97f5451809294b74302f0e45992584203d14a270b4a1833990e4e8fb` |
| **Network** | Fushuma (Chain ID: 121224) |
| **Deployment Date** | November 25, 2025 |
| **Git Commit** | `6f04efd` |
| **Commit Message** | "Fix MixedQuoterRecorder storage cleanup for Shanghai EVM compatibility" |
| **Previous Address** | `0x82b5d24754AAB72AbF2D4025Cb58F8321c3d0305` (Deprecated) |

---

## Changes Included in This Deployment

The deployed commit `6f04efd` addresses a critical issue with the MixedQuoterRecorder library:

### Problem Fixed

The MixedQuoterRecorder library uses regular storage instead of transient storage for Shanghai EVM compatibility. However, the `clearPoolData()` function was never being called, which could cause stale data to persist between calls when the quoter is invoked via actual transactions.

### Solution Implemented

- Track all pool hashes used during `quoteMixedExactInputWithContext()`
- Call `clearPoolData()` for each tracked pool at the end of the function
- Only cleanup when `withContext=true` (when storage is actually used)

This ensures proper storage cleanup and prevents data leakage between quote operations.

---

## Contract Configuration

The MixedQuoter was deployed with the following dependencies:

| Dependency | Address |
|------------|---------|
| **WFUMA** | `0xBcA7B11c788dBb85bE92627ef1e60a2A9B7e2c6E` |
| **CL Quoter** | `0x9a554202Ff6E62e5533D394330D0A4B57efF7C7a` |
| **BIN Quoter** | `0x82b5d24754AAB72AbF2D4025Cb58F8321c3d0305` |
| **Dummy Factory** | `0xf4C3914B127571fDfDdB3B5caCE6a9428DB0183b` |

---

## Deployment Statistics

| Metric | Value |
|--------|-------|
| **Gas Used** | 3,911,247 |
| **Gas Price** | 239,000 gwei |
| **Total Cost** | ~934.788 ETH |
| **Compilation Time** | 45.58 seconds |
| **Files Compiled** | 62 files with Solc 0.8.20 |

---

## Files Updated

The following files in `fushuma-gov-hub-v2` were updated to reflect the new MixedQuoter address:

### Core Configuration
- `src/lib/fumaswap/contracts.ts` - Added `mixedQuoter` and `MIXED_QUOTER_ADDRESS` exports

### Documentation
- `DEPLOYED_CONTRACTS.md` - Added MixedQuoter section
- `FUSHUMA_CONTRACT_INTEGRATION_DOCUMENTATION.md` - Updated MixedQuoter address
- `FUSHUMA_DEFI_INVESTIGATION_REPORT.md` - Updated MixedQuoter references
- `FUSHUMA_DEPLOYED_CONTRACTS_SOURCE_CODE.md` - Updated MixedQuoter section
- `SMART_CONTRACT_DEPLOYMENT.md` - Updated MIXED_QUOTER address
- `FUSHUMA_INTEGRATION_CODE_COMPLETE.md` - Updated mixedQuoter config

---

## Deployment Status

**STATUS: DEPLOYMENT SUCCESSFUL**

The contract has been deployed and is ready for use on the Fushuma network. All storage cleanup mechanisms are now properly implemented to prevent data leakage between quote operations.

---

## Verification

To verify the deployment, check:

1. **Explorer Link:** [https://fumascan.com/address/0x0Ea2c4B7990EB44f2E9a106b159C165e702dF98d](https://fumascan.com/address/0x0Ea2c4B7990EB44f2E9a106b159C165e702dF98d)

2. **Transaction:** [https://fumascan.com/tx/0xb9ddf8be97f5451809294b74302f0e45992584203d14a270b4a1833990e4e8fb](https://fumascan.com/tx/0xb9ddf8be97f5451809294b74302f0e45992584203d14a270b4a1833990e4e8fb)

---

## Next Steps

1. **Frontend Integration** - Update any frontend services using MixedQuoter to use the new address
2. **Testing** - Verify contract functionality through test transactions
3. **Monitoring** - Monitor for any issues with quote operations
4. **Documentation** - This deployment has been documented in all relevant files

---

**Report Generated:** November 25, 2025
**Maintained By:** Fushuma Development Team
