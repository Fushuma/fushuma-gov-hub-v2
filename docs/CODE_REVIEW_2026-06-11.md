# Fushuma Gov Hub v2 — Full Codebase Review

**Date:** June 11, 2026

**TL;DR:** The foundation is genuinely good — modern stack, type-safe API layer, clean
component architecture, working governance flows — and worth keeping as-is. The biggest
problems are: the repo failed its own type-check (fixed alongside this review), the swap
path has real correctness bugs (hardcoded slippage, suspect router encoding, a
floating-point tick-math implementation), auth has fixable security gaps (fallback JWT
secret, non-HttpOnly cookie, client-supplied voting power), and there was no CI and almost
no tests to stop regressions. Governance is the most production-ready area; FumaSwap is
the least.

---

## ✅ What works and should be kept

**Architecture & stack.** Next.js 16 App Router + React 19 + tRPC 11 + Drizzle/MySQL +
wagmi/viem/RainbowKit is a current, coherent stack. The separation into `src/app` /
`components` / `lib` / `server` / `db` / `config` is clean and easy to navigate.

**The tRPC backend core.** `src/server/_core/trpc.ts` has proper `publicProcedure` /
`protectedProcedure` / `adminProcedure` tiers, Zod validation everywhere
(`src/server/validation.ts` includes custom Ethereum-address and tx-hash validators), and
consistent error codes. The Drizzle schema (`src/db/schema.ts`) is well-indexed with soft
deletes and inferred types.

**SIWE wallet auth flow.** Nonce → signed message → `viem.verifyMessage` → JWT via `jose`
(`src/server/_core/web3Auth.ts`, `src/server/routers/auth.ts`) is the right design. The
gaps listed below are implementation details, not architectural ones.

**Governance feature set.** Proposals list, voting (For/Against/Abstain), veNFT wrapping,
gauges, delegates — these pages are functional, use `useWaitForTransactionReceipt`
correctly, and the governance contract config (`src/lib/governance/contracts.ts`) is
well-documented. The governance event indexer (`src/server/services/governance-indexer.ts`)
does chunked log fetching properly. The unit tests in `src/lib/governance/utils.test.ts`
pass.

**Liquidity math in `src/lib/fumaswap/utils/liquidityMath.ts`.** This is the *correct*
Uniswap-v3 bit-shift lookup-table implementation, handling all three price-range cases.
Same for `positionUtils.ts`, which uses the SDK's `TickMath`. Keep these — the problem is
that a third, wrong copy exists elsewhere (see below).

**UI/provider layer.** The Radix-based component library in `src/components/ui`, dark mode
via `next-themes`, dynamic imports of wallet/auth providers to dodge hydration issues, and
sensible React Query defaults in `src/app/providers.tsx` are all solid. The 28 static docs
pages are complete.

**Services.** GitHub grant sync (`src/server/services/github-sync.ts`) and the
DeFi/governance indexers are well-structured and worth building on.

---

## 🔴 Critical — fix first

1. **Type-check failed on main.** `pnpm type-check` errored at
   `src/app/governance/page.tsx:38` (`votingPower >= proposalThreshold` — bigint vs `{}`,
   caused by an untyped JSON ABI import making wagmi's `useReadContract` return `{}`).
   *Fixed in this branch* by typing `useProposalThreshold`'s return in
   `src/lib/governance/hooks.ts`. Note: `next/font/google` in `layout.tsx` also makes
   builds depend on reaching Google Fonts; consider self-hosting the fonts.

2. **Proposal detail page is mock data.** `src/app/governance/[id]/page.tsx:58` hardcodes
   `MOCK_PROPOSALS` for IDs 1–3 and looks proposals up from it (line 153). Real on-chain
   proposals can't be viewed. The list page already reads chain data, so wire the detail
   page to the same source/indexer.

3. **Swap quoting ignores user slippage.** `src/lib/fumaswap/swap.ts:286` hardcodes
   `* 0.995` ("0.5% slippage") regardless of the `slippageTolerance` parameter the function
   accepts. Related: the Universal Router command encoding in `executeSwap()` (~line 334)
   doesn't match PancakeSwap V4's expected nested-struct path encoding and likely reverts
   on-chain — this needs an end-to-end test against the deployed router before swap can be
   called working.

4. **Wrong tick math in `src/lib/fumaswap/pools.ts:575`.** A floating-point
   `Math.sqrt(Math.pow(1.0001, tick))` reimplementation of `getSqrtRatioAtTick` exists
   alongside the two correct implementations. Delete it and import the lookup-table version
   from `liquidityMath.ts` — float precision will silently miscompute position values at
   larger ticks.

5. **Server trusts client-supplied voting power.** `src/server/routers/proposals.ts:137`
   accepts `votingPower` from the client (default 1) and records it without checking
   on-chain balance. Anyone can vote with arbitrary weight in the DB. Fetch actual voting
   power server-side. Also: the existing-vote check then insert (lines 157–173) isn't
   atomic — add a unique constraint on (proposalId, userId).

6. **Fallback JWT secret.** `src/server/_core/context.ts:7` and `auth.ts:16` fall back to
   the literal `"fushuma-secret-key-change-in-production"` when `JWT_SECRET` is unset.
   Throw at startup instead.

---

## 🟠 High — security and correctness

- **Session cookie set from client JS without HttpOnly**
  (`src/components/providers/AuthProvider.tsx:78`) — any XSS steals tokens. Set it
  server-side via `Set-Cookie` with HttpOnly + Secure. Relatedly, tRPC mutations have
  **no CSRF protection** with a cookie-based session.
- **GitHub comment HTML rendered via `dangerouslySetInnerHTML`**
  (`src/app/grants/[id]/page.tsx:348`). GitHub sanitizes its `body_html`, so this isn't an
  open hole, but it trusts a third party end-to-end; sanitize with DOMPurify (or render
  `body` markdown locally) for defense in depth.
- **No rate limiting** anywhere (nonce generation, voting, grant/launchpad creation). The
  in-memory nonce store (`web3Auth.ts:4`) also breaks under multi-instance deployment —
  move to Redis (ioredis is already a dependency).
- **Unlimited token approvals** (`useTokenApprove.ts:46` approves `maxUint256`).
  Industry-common but worth offering exact-amount approval, especially since Permit2 is
  already deployed.
- **Fee-tier selection picks the first pool with any liquidity, not the deepest**
  (`swap.ts:87–136`) — users can get routed into a dust pool with terrible execution.
- **LP position fees hardcoded to zero** (`pools.ts:431–432`) — users can't see earned
  fees, and total position value is understated.
- **No error.tsx / loading.tsx anywhere** in the App Router tree — a runtime error
  white-screens the app, and async segments show blanks instead of skeletons.

---

## 🟡 Medium — debt and gaps

- **Ethers v5 still used in the launchpad** (`src/lib/launchpad/ico.ts`, `tokens.ts`)
  while everything else is viem/wagmi. Migrate and drop ethers, plus the unused
  `jsonwebtoken` dep (the app uses `jose`).
- **Stubbed/incomplete pages shipped:** `defi/fumaswap/liquidity`, `pools`, `positions`,
  `bridge/claim`, and the ecosystem page (3 hardcoded projects,
  `src/app/ecosystem/page.tsx:12`). Home page hardcodes "1,234 Contributors"
  (`src/app/page.tsx:154`). Either finish, hide behind a flag, or label as coming soon.
- **Position enumeration is O(N) sequential RPC calls** (`pools.ts:371`) — use multicall.
- **bigint→Number conversions for vote percentages** (`governance/page.tsx:220`) lose
  precision at scale; `window.location.href` navigation in community pages bypasses the
  client router; only ~8 ARIA attributes across the whole frontend.
- **tRPC context does a DB user lookup on every request** with no caching.

---

## 🟤 Repo hygiene & process

- **No CI.** *A minimal pipeline (lint → type-check → test → build) was added alongside
  this review* (`.github/workflows/ci.yml`).
- **~0.7% test coverage:** one unit-test file plus one Playwright smoke spec for 28k lines.
  Priorities for new tests: swap quoting/encoding, tRPC routers (auth, proposals, grants),
  liquidity math edge cases.
- **Both `package-lock.json` and `pnpm-lock.yaml` were committed** — the npm one was
  removed alongside this review (project declares `pnpm@10.4.1`).
- **Root clutter:** ~20 markdown reports (`DEPLOYMENT_REPORT_*`, `FUSHUMA_*_REPORT`,
  `FIXES_APPLIED.md`…), two committed `.patch` files (one 113KB), and five loose one-off
  scripts (`check_ico.ts`, `sync-grants*.ts`…). Keep README/DEPLOYMENT/SECURITY/
  TROUBLESHOOTING, move the rest to `docs/` or delete; move scripts into `scripts/`.
- **`.env.example` was missing the five Telegram variables** the telegram-sync service
  reads (*added alongside this review*); `deploy.sh` hardcodes an SSH key path.

---

## Suggested order of attack

1. ~~Fix the type error, delete `package-lock.json`, add a CI workflow that gates on
   lint/type-check/test/build~~ *(done alongside this review)*.
2. ~~Auth hardening: required JWT secret, HttpOnly server-set cookie, server-side voting
   power, vote unique constraint, basic rate limiting~~ *(done — JWT secret now required
   in production, session cookie is HttpOnly and set server-side, Origin check on
   mutations, voting power read from VotingEscrow on-chain, unique vote constraint +
   transaction, KV-backed nonces and rate limits with Redis support; **requires
   `pnpm db:push` to apply the new unique index**)*.
3. ~~FumaSwap correctness: user slippage, single tick-math implementation, router
   encoding, best-liquidity fee-tier selection~~ *(done — user slippage flows from the
   widget through quotes and execution, the floating-point tick math was deleted in
   favour of the lookup-table version, fee tiers are picked by deepest liquidity, and
   `executeSwap` now encodes a proper INFI_SWAP (0x10) command with
   CL_SWAP_EXACT_IN_SINGLE→SETTLE_ALL→TAKE_ALL actions plus a Permit2 two-step approval
   flow. **Still needs one end-to-end swap on mainnet to verify against the deployed
   router** — encoding was verified by round-trip decode only. Position fee display
   (feeGrowth math) remains TODO)*.
4. ~~Replace mock proposal detail data; add error/loading boundaries~~ *(done — the
   proposal detail page reads on-chain state and recovers title/description/call data
   from the ProposalCreated event, so queue/execute now use real targets/calldatas;
   error.tsx/global-error.tsx/loading.tsx boundaries added; GitHub comment HTML is
   DOMPurify-sanitized; window.location navigation replaced with Link/router)*.
5. Finish or hide stubbed pages (`defi/fumaswap/liquidity|pools`, `bridge/claim`,
   ecosystem page); ethers→viem migration of the launchpad lib; ~~repo cleanup~~
   *(done — stale reports archived to `docs/archive/`, current docs moved to `docs/`,
   patch files removed, loose root scripts moved into `scripts/`)*.

The strategic picture: governance + grants + docs + news are in good shape and the
architecture supports the roadmap — don't rewrite anything. Spend effort on the DeFi
correctness gaps and the missing safety nets (CI, tests, auth hardening) before adding
new features.
