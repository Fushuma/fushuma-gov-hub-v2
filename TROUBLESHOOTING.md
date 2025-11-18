# Fushuma Governance Hub - Troubleshooting Guide

**Last Updated:** 2025-11-18  
**Purpose:** Document recurring issues and their solutions to avoid solving the same problems repeatedly.

---

## Critical Issue: Next.js 16 + Turbopack Build Problems

### Problem
- Build completes successfully (shows all routes)
- But **BUILD_ID** file is not created
- Server crashes with: `Error: Could not find a production build in the '.next' directory`
- Sometimes also missing `routes-manifest.json`

### Root Cause
Next.js 16 with Turbopack (experimental) has incomplete production build output. The build process finishes but doesn't generate all required manifest files.

### Solution
**Option 1: Disable Turbopack (RECOMMENDED)**
```bash
cd fushuma-gov-hub-v2
rm -rf .next
TURBOPACK=0 pnpm run build
pm2 restart fushuma-gov-hub-v2
```

**Option 2: Downgrade Next.js**
```bash
pnpm install next@15.0.3
```

**Option 3: Manual Workaround (temporary)**
```bash
# After build completes
echo "production-$(date +%s)" > .next/BUILD_ID
pm2 restart fushuma-gov-hub-v2
```

### Prevention
- Remove Turbopack from next.config.ts
- Or set `TURBOPACK=0` in PM2 ecosystem file
- Consider downgrading to Next.js 15 until 16 is stable

---

## PM2 Restart Timing Issue

### Problem
- PM2 restarts before build completes
- Server starts with incomplete .next directory
- Causes "BUILD_ID not found" errors

### Solution
**Never run build and PM2 restart in the same command!**

❌ Wrong:
```bash
pnpm run build && pm2 restart app
```

✅ Correct:
```bash
pm2 stop app
pnpm run build
# Wait for build to complete
pm2 start app
```

### Best Practice
```bash
pm2 stop fushuma-gov-hub-v2
pnpm run build
sleep 5  # Give build time to finish writing files
pm2 start fushuma-gov-hub-v2
```

---

## veNFT Create Lock Button Issue

### Problem
- "Create Lock" button does nothing
- No transaction popup
- No console errors

### Root Cause
Frontend was calling `createLock(amount, duration)` with 2 parameters, but the smart contract only accepts `createLock(amount)` with 1 parameter.

### Solution
**File:** `src/app/governance/venft/page.tsx`

❌ Wrong:
```typescript
args: [amountWei, BigInt(duration)],  // 2 parameters
```

✅ Correct:
```typescript
args: [amountWei],  // 1 parameter only
```

### Additional Changes
- Removed duration selector UI (contract uses automatic growth)
- Added explanation of 1x to 4x voting power growth over 1 year
- Added 7-day warmup period notice

**Committed to GitHub:** Commit `f549d3f`

---

## Add Liquidity Gas Estimation Issues

### Problem
- MetaMask shows very low gas fee (< $0.01)
- Transaction fails or doesn't execute
- Works on wrap/veNFT pages but not liquidity

### Investigation Status
**IN PROGRESS** - Not yet solved

### Known Facts
1. Wrap and veNFT pages use simple `useWriteContract()` pattern ✅
2. Add Liquidity uses complex PancakeSwap V4 encoding ❌
3. PancakeSwap frontend uses `useSendTransaction` with manual gas estimation
4. Current implementation uses `writeContractAsync` which may not estimate gas correctly for complex multicall transactions

### Next Steps
1. Study PancakeSwap's exact implementation from their GitHub
2. Switch from `writeContractAsync` to `sendTransaction`
3. Add manual gas estimation before sending
4. Test with actual wallet

### Resources
- https://github.com/pancakeswap/pancake-frontend
- https://github.com/pancakeswap/infinity-periphery
- https://github.com/pancakeswap/infinity-universal-router

---

## Git Workflow Best Practices

### Problem
- Stable code gets lost
- Reverting to broken versions
- No clear history of what works

### Solution
**ALWAYS commit working code immediately!**

```bash
# After fixing something that works
git add <fixed-files>
git commit -m "fix: Clear description of what was fixed"
git push origin main

# Before trying experimental changes
git checkout -b experimental-fix
# Make changes
# If it works:
git checkout main
git merge experimental-fix
git push
# If it doesn't work:
git checkout main
git branch -D experimental-fix
```

### Commit Message Format
```
fix: Short description (50 chars max)

- What was broken
- What was changed
- Why it fixes the issue
```

---

## Server Deployment Checklist

Before deploying to production server:

1. ✅ Test build locally first
   ```bash
   cd /home/ubuntu/fushuma-gov-hub-v2
   pnpm run build
   ```

2. ✅ Check if BUILD_ID was created
   ```bash
   ls -la .next/BUILD_ID
   ```

3. ✅ Commit working code to GitHub
   ```bash
   git add .
   git commit -m "fix: Description"
   git push
   ```

4. ✅ Copy files to server
   ```bash
   scp -i key.pem <files> azureuser@40.124.72.151:~/fushuma-gov-hub-v2/
   ```

5. ✅ Stop PM2 before building
   ```bash
   ssh azureuser@40.124.72.151 "pm2 stop fushuma-gov-hub-v2"
   ```

6. ✅ Build on server
   ```bash
   ssh azureuser@40.124.72.151 "cd fushuma-gov-hub-v2 && pnpm run build"
   ```

7. ✅ Verify BUILD_ID exists
   ```bash
   ssh azureuser@40.124.72.151 "cat fushuma-gov-hub-v2/.next/BUILD_ID"
   ```

8. ✅ Start PM2
   ```bash
   ssh azureuser@40.124.72.151 "pm2 start fushuma-gov-hub-v2"
   ```

9. ✅ Test the site
   ```bash
   curl https://governance2.fushuma.com
   ```

---

## Common Errors Reference

### Error: "Could not find a production build"
**Cause:** BUILD_ID missing  
**Solution:** See "Next.js 16 + Turbopack Build Problems" above

### Error: "ENOENT: no such file or directory, open '.next/routes-manifest.json'"
**Cause:** Turbopack incomplete build  
**Solution:** Disable Turbopack, rebuild with webpack

### Error: "Invalid next.config.ts options detected: serverComponentsExternalPackages"
**Cause:** Next.js 16 deprecated this option  
**Solution:** Move to `serverExternalPackages` in next.config.ts (warning only, not critical)

### Error: Transaction shows very low gas
**Cause:** Gas estimation failure in complex transactions  
**Solution:** Under investigation - see "Add Liquidity Gas Estimation Issues"

---

## Quick Reference Commands

### Check server status
```bash
ssh -i key.pem azureuser@40.124.72.151 "pm2 status"
```

### View server logs
```bash
ssh -i key.pem azureuser@40.124.72.151 "pm2 logs fushuma-gov-hub-v2 --lines 50"
```

### Full rebuild
```bash
ssh -i key.pem azureuser@40.124.72.151 "cd fushuma-gov-hub-v2 && pm2 stop fushuma-gov-hub-v2 && rm -rf .next && pnpm run build && pm2 start fushuma-gov-hub-v2"
```

### Emergency rollback
```bash
ssh -i key.pem azureuser@40.124.72.151 "cd fushuma-gov-hub-v2 && git reset --hard HEAD~1 && pm2 stop fushuma-gov-hub-v2 && pnpm run build && pm2 start fushuma-gov-hub-v2"
```

---

## Notes for Future Development

1. **Always test locally first** - Don't experiment on production
2. **Commit stable code immediately** - Don't wait
3. **Document new issues here** - Update this file when you solve something
4. **Keep it simple** - Complex abstractions cause more problems
5. **Follow working patterns** - If wrap/veNFT work, copy that pattern

---

**Remember:** This document should be updated every time a new issue is solved or a pattern is discovered!
