# Fushuma Gov Hub V2 - Shanghai EVM Action Plan

**Priority:** Medium  
**Estimated Time:** 2-4 hours  
**Risk Level:** Low

## Quick Summary

The **fushuma-gov-hub-v2** is a frontend application that doesn't need code changes for Shanghai EVM compatibility. However, you should:

1. ✅ Update documentation (15 minutes)
2. ⚠️ Verify deployed contracts (30 minutes)
3. 🔄 Optionally deploy MixedQuoter (1-2 hours)

## Immediate Actions (Required)

### 1. Update Documentation References

**Time:** 15 minutes  
**Risk:** None

```bash
cd /home/ubuntu/fushuma-gov-hub-v2

# Update the contracts.ts comment
sed -i 's/Paris EVM Compatible/Shanghai EVM Compatible/g' src/lib/fumaswap/contracts.ts

# Commit the change
git add src/lib/fumaswap/contracts.ts
git commit -m "docs: Update EVM version reference from Paris to Shanghai"
```

### 2. Update SMART_CONTRACT_DEPLOYMENT.md

**Time:** 10 minutes  
**Risk:** None

Add this section at the beginning of `SMART_CONTRACT_DEPLOYMENT.md`:

```markdown
## Compiler Requirements

**IMPORTANT:** All contracts MUST be compiled with:
- **Solidity Version:** 0.8.20
- **EVM Version:** shanghai

Configure in `foundry.toml`:
```toml
[profile.default]
solc_version = "0.8.20"
evm_version = "shanghai"
```

These settings ensure compatibility with the Fushuma Network.
```

## Verification Actions (Recommended)

### 3. Verify Deployed Contract Compatibility

**Time:** 30 minutes  
**Risk:** Low

```bash
# Set up environment
export RPC_URL="https://rpc.fushuma.com"

# Check each deployed contract
echo "Checking Vault..."
cast code 0x4FB212Ed5038b0EcF2c8322B3c71FC64d66073A1 --rpc-url $RPC_URL | head -c 100

echo "Checking CLPoolManager..."
cast code 0x9123DeC6d2bE7091329088BA1F8Dc118eEc44f7a --rpc-url $RPC_URL | head -c 100

echo "Checking UniversalRouter..."
cast code 0xE489902A6F5926C68B8dc3431FAaF28A73C1AE95 --rpc-url $RPC_URL | head -c 100

# If contracts exist and return bytecode, they're deployed
# The actual EVM version compatibility can only be verified by:
# 1. Checking the source code used for deployment
# 2. Testing contract functionality
```

### 4. Test Contract Interactions

**Time:** 30 minutes  
**Risk:** Low

```bash
cd /home/ubuntu/fushuma-gov-hub-v2

# Install dependencies if not already done
pnpm install

# Run the development server
pnpm dev

# Open browser and test:
# 1. Connect wallet
# 2. Try a token swap
# 3. Check liquidity pools
# 4. Test governance voting
# 5. Verify no errors in console
```

**If everything works:** ✅ Contracts are compatible, no action needed

**If errors occur:** ⚠️ May need to redeploy contracts

## Optional Actions (Recommended)

### 5. Deploy MixedQuoter Contract

**Time:** 1-2 hours  
**Risk:** Medium  
**Benefit:** Enables better quote aggregation across pool types

**Why:** The MixedQuoter was previously skipped because it used transient storage. It's now been migrated to use regular storage and is Shanghai-compatible.

```bash
cd /home/ubuntu/fushuma-contracts

# Ensure you have the migrated version
git log --oneline | head -5
# Should show: "feat: Migrate to Solidity 0.8.20 and Shanghai EVM"

# Set up deployment environment
export PRIVATE_KEY="your_private_key_here"
export RPC_URL="https://rpc.fushuma.com"
export CL_POOL_MANAGER="0x9123DeC6d2bE7091329088BA1F8Dc118eEc44f7a"
export BIN_POOL_MANAGER="0x3014809fBFF942C485A9F527242eC7C5A9ddC765"
export VAULT="0x4FB212Ed5038b0EcF2c8322B3c71FC64d66073A1"

# Check the MixedQuoter constructor requirements
grep -A 20 "constructor" src/infinity-periphery/lens/MixedQuoter.sol

# Deploy MixedQuoter
# Note: You'll need to check the actual constructor parameters
forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  src/infinity-periphery/lens/MixedQuoter.sol:MixedQuoter \
  --constructor-args $VAULT $CL_POOL_MANAGER $BIN_POOL_MANAGER

# Save the deployed address
export MIXED_QUOTER_ADDRESS="<deployed_address>"

# Update gov-hub-v2
cd /home/ubuntu/fushuma-gov-hub-v2
# Edit src/lib/fumaswap/contracts.ts
# Change: mixedQuoter: '0x0000000000000000000000000000000000000000'
# To:     mixedQuoter: '<deployed_address>'

# Commit the change
git add src/lib/fumaswap/contracts.ts
git commit -m "feat: Add MixedQuoter contract address"
```

## Conditional Actions (Only If Needed)

### 6. Redeploy All Contracts

**Time:** 4-8 hours  
**Risk:** High  
**When:** Only if verification shows contracts are NOT Shanghai-compatible

**⚠️ WARNING:** This will create new contract addresses and require updating the frontend

```bash
cd /home/ubuntu/fushuma-contracts

# Ensure you're on the migrated version
git log --oneline | head -1
# Should show: "feat: Migrate to Solidity 0.8.20 and Shanghai EVM"

# Follow the deployment guide
# See: SHANGHAI_MIGRATION_SUMMARY.md

# Deploy in order:
# 1. Vault
# 2. CLPoolManager
# 3. BinPoolManager
# 4. CLPositionManager
# 5. BinPositionManager
# 6. CLQuoter
# 7. BinQuoter
# 8. MixedQuoter
# 9. UniversalRouter

# After deployment, update ALL addresses in gov-hub-v2
cd /home/ubuntu/fushuma-gov-hub-v2

# Edit src/lib/fumaswap/contracts.ts
# Update all contract addresses

# Test thoroughly before deploying to production
```

## Verification Checklist

After completing actions:

### Documentation
- [ ] Updated "Paris EVM" to "Shanghai EVM" in contracts.ts
- [ ] Added compiler requirements to SMART_CONTRACT_DEPLOYMENT.md
- [ ] Updated any other references to EVM version

### Contract Verification
- [ ] Checked that deployed contracts exist on-chain
- [ ] Tested contract interactions via frontend
- [ ] No errors in browser console
- [ ] Transactions confirm successfully

### Optional Enhancements
- [ ] Deployed MixedQuoter (if desired)
- [ ] Updated contract address in frontend
- [ ] Tested MixedQuoter functionality

### Git Commits
- [ ] Committed documentation updates
- [ ] Committed contract address updates (if any)
- [ ] Pushed changes to repository

## Risk Assessment

| Action | Risk Level | Impact if Skipped |
|--------|-----------|-------------------|
| Update documentation | None | Confusion for developers |
| Verify contracts | Low | Unknown compatibility status |
| Deploy MixedQuoter | Medium | Missing quote aggregation feature |
| Redeploy all contracts | High | All addresses change, frontend breaks |

## Decision Tree

```
Start
  │
  ├─> Update documentation → ✅ Done (15 min)
  │
  ├─> Verify contracts work?
  │   ├─> Yes → ✅ No redeployment needed
  │   │         │
  │   │         └─> Want MixedQuoter?
  │   │             ├─> Yes → Deploy MixedQuoter (1-2 hrs)
  │   │             └─> No → ✅ Done
  │   │
  │   └─> No → ⚠️ Need to redeploy contracts (4-8 hrs)
  │             │
  │             └─> Follow full deployment guide
  │
  └─> End
```

## Recommended Approach

**For Most Users:**

1. ✅ Update documentation (15 min)
2. ✅ Verify contracts work (30 min)
3. ✅ If working, you're done!

**For Advanced Users:**

1. ✅ Update documentation (15 min)
2. ✅ Verify contracts work (30 min)
3. ✅ Deploy MixedQuoter (1-2 hrs)
4. ✅ Test thoroughly

**If Contracts Don't Work:**

1. ⚠️ Redeploy all contracts (4-8 hrs)
2. ⚠️ Update all addresses in frontend
3. ⚠️ Test extensively
4. ⚠️ Deploy to production

## Support Resources

- **Contract Migration Report:** `/home/ubuntu/fushuma-contracts/SHANGHAI_MIGRATION_SUMMARY.md`
- **Compatibility Report:** `/home/ubuntu/FUSHUMA_GOV_HUB_V2_COMPATIBILITY_REPORT.md`
- **Migrated Contracts:** `/home/ubuntu/fushuma-contracts/`
- **Deployment Guide:** `/home/ubuntu/fushuma-gov-hub-v2/SMART_CONTRACT_DEPLOYMENT.md`

## Questions to Answer

Before starting:

1. **Are the currently deployed contracts working correctly?**
   - If yes → Just update documentation
   - If no → May need redeployment

2. **Do you need MixedQuoter functionality?**
   - If yes → Deploy it (now available)
   - If no → Skip it

3. **Is the Fushuma network running Shanghai EVM?**
   - If yes → Contracts must be Shanghai-compatible
   - If no → Check network EVM version

4. **Do you have time for a full redeployment if needed?**
   - If yes → Can redeploy if verification fails
   - If no → Verify first, plan redeployment later

## Next Steps

**Start here:**

```bash
# 1. Update documentation (safe, quick)
cd /home/ubuntu/fushuma-gov-hub-v2
sed -i 's/Paris EVM Compatible/Shanghai EVM Compatible/g' src/lib/fumaswap/contracts.ts
git add src/lib/fumaswap/contracts.ts
git commit -m "docs: Update EVM version reference to Shanghai"

# 2. Test the frontend
pnpm dev
# Open http://localhost:3000 and test functionality

# 3. Based on results, decide next steps
```

---

**Action Plan prepared by:** Manus AI  
**Date:** November 18, 2025  
**Status:** Ready to execute
