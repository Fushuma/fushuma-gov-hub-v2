# Fushuma DeFi - Smart Contract Integration Documentation

**Date:** November 19, 2025  
**Frontend Version:** 2.0.1  
**Network:** Fushuma Mainnet (Chain ID: 121224)

---

## Overview

This document outlines how each smart contract in the Fushuma DeFi platform is integrated with the frontend application. It details the UI components, backend functions, and contract interactions for each major feature.

### Key Integration Files

- **UI Components:** `src/components/defi/`
- **Frontend Logic:** `src/lib/fumaswap/`
- **Contract ABIs:** `src/lib/fumaswap/abis/`
- **Contract Addresses:** `src/lib/fumaswap/contracts.ts`

### Frontend Libraries

- **Wagmi:** React Hooks for Ethereum (wallet connection, contract interaction)
- **Viem:** Low-level Ethereum interface (ABI encoding, RPC calls)
- **PancakeSwap SDK:** Used for token and data structures

---

## 1. UniversalRouter

**Address:** `0x9a554202Ff6E62e5533D394330D0A4B57efF7C7a`  
**Purpose:** Main entry point for all swap transactions.

### UI Integration

- **Component:** `SwapWidget.tsx` (`src/components/defi/SwapWidget.tsx`)
- **Page:** `/defi/fumaswap/swap`

**User Actions:**
- User selects input/output tokens and enters an amount
- Clicks the "Swap" button

### Frontend Logic

- **File:** `swap.ts` (`src/lib/fumaswap/swap.ts`)
- **Function:** `executeSwap()`

**Workflow:**
1. `SwapWidget.tsx` calls `executeSwap()` when user clicks "Swap"
2. `executeSwap()` gets a quote from `CLQuoter` via `getSwapQuote()`
3. It calculates the minimum output amount based on slippage tolerance
4. It encodes the `V4_SWAP` command and input parameters for the Universal Router
5. It calls the `execute()` function on the `UniversalRouter` contract using Wagmi `writeContractAsync`

### Contract Interaction

- **Contract:** `UniversalRouter.sol`
- **Function:** `execute(bytes commands, bytes[] inputs, uint256 deadline)`

**Parameters:**
- `commands`: `0x00` (V4_SWAP)
- `inputs`: ABI-encoded parameters for the swap (recipient, amountIn, amountOutMin, path)
- `deadline`: Transaction deadline timestamp

---

## 2. CLQuoter & MixedQuoter

**CLQuoter Address:** `0x8197a04498bee6212aF4Ef5A647f35FF8Ff6841b`  
**MixedQuoter Address:** `0x82b5d24754AAB72AbF2D4025Cb58F8321c3d0305`  
**Purpose:** Provide on-chain price quotes for swaps.

### UI Integration

- **Component:** `SwapWidget.tsx`
- **Page:** `/defi/fumaswap/swap`

**User Actions:**
- When the user types an input amount, the output amount is automatically updated with a quote.

### Frontend Logic

- **File:** `swap.ts`
- **Function:** `getSwapQuote()`

**Workflow:**
1. `SwapWidget.tsx` calls `getSwapQuote()` whenever the input amount or tokens change
2. `getSwapQuote()` prepares the quote parameters (pool key, amount, direction)
3. It calls the `quoteExactInputSingle()` function on the `CLQuoter` contract using Viem `readContract`
4. The returned quote is displayed in the UI

**Note:** `MixedQuoter` is deployed but not currently used in the frontend. All quotes are handled by `CLQuoter`.

### Contract Interaction

- **Contract:** `CLQuoter.sol`
- **Function:** `quoteExactInputSingle(QuoteParams memory params)`

**Parameters:**
- `params`: Struct containing pool key, swap direction, and input amount

---

## 3. CLPositionManager

**Address:** `0xF354672DD5c502567a5Af784d91f1a735559D2aC`  
**Purpose:** Manage concentrated liquidity positions (mint, burn, collect fees).

### UI Integration

- **Component:** `AddLiquidity.tsx` (`src/components/defi/AddLiquidity.tsx`)
- **Page:** `/defi/fumaswap/liquidity`

**User Actions:**
- User selects tokens, fee tier, and deposit amounts
- User approves tokens for spending by the `CLPositionManager`
- User clicks "Add Liquidity"

### Frontend Logic

- **File:** `liquidity.ts` (`src/lib/fumaswap/liquidity.ts`)
- **Function:** `addLiquidity()`

**Workflow:**
1. `AddLiquidity.tsx` calls `addLiquidity()` when user clicks "Add Liquidity"
2. `addLiquidity()` calculates the required liquidity amount based on user inputs and current pool price
3. It uses an `ActionsPlanner` to create a sequence of actions (e.g., `CL_MINT_POSITION`)
4. It calls the `modifyLiquidities()` function on the `CLPositionManager` contract

### Contract Interaction

- **Contract:** `CLPositionManager.sol`
- **Functions:**
  - `modifyLiquidities(bytes[] calldata data, uint256 deadline)` - Main function for adding/removing liquidity
  - `positions(uint256 tokenId)` - View position details
  - `collect(CollectParams calldata params)` - Collect fees

---

## 4. CLPoolManager

**Address:** `0xef02f995FEC090E21709A7eBAc2197d249B1a605`  
**Purpose:** Core logic for concentrated liquidity pools (manages state, fees, swaps).

### UI Integration

- **Component:** `PoolBrowser.tsx` (`src/components/defi/PoolBrowser.tsx`)
- **Page:** `/defi/fumaswap/pools`

**User Actions:**
- User can view a list of available liquidity pools and their stats (TVL, volume, APR).

### Frontend Logic

- **File:** `pools.ts` (`src/lib/fumaswap/pools.ts`)
- **Function:** `getPools()` (hypothetical, currently uses `STATIC_POOLS`)

**Workflow:**
1. `PoolBrowser.tsx` displays a list of pools from `STATIC_POOLS`
2. For each pool, it calls `getSlot0()` and `getLiquidity()` on the `CLPoolManager` to fetch real-time data
3. This data is used to calculate and display TVL and other stats

### Contract Interaction

- **Contract:** `CLPoolManager.sol`
- **Functions:**
  - `getSlot0(bytes32 id)` - Get current pool state (price, tick)
  - `getLiquidity(bytes32 id)` - Get total liquidity in the pool
  - `initialize(PoolKey memory key, uint160 sqrtPriceX96)` - Initialize a new pool (currently failing)

---

## 5. Vault

**Address:** `0xcf842B77660ccEBD24fB3f860Ab2304c5B9F5A4E`  
**Purpose:** Securely holds all tokens for all pools.

### UI Integration

- **No direct UI integration.** The Vault operates in the background.

### Frontend Logic

- **No direct frontend logic.** All interactions with the Vault are handled by other contracts (`CLPoolManager`, `UniversalRouter`).

### Contract Interaction

- **Contract:** `Vault.sol`
- **Functions:**
  - `lock(address token, uint256 amount)` - Called by other contracts to deposit tokens
  - `unlock(address token, uint256 amount)` - Called by other contracts to withdraw tokens

**Workflow:**
- When a user swaps tokens, the `UniversalRouter` calls `Vault.lock()` to deposit the input tokens and `Vault.unlock()` to withdraw the output tokens.
- When a user adds liquidity, the `CLPositionManager` calls `Vault.lock()` to deposit the user's tokens.

---

## 6. Bin Contracts (BinPoolManager, BinPositionManager, BinQuoter)

**Addresses:**
- `BinPoolManager`: `0xCF6C0074c43C00234cC83D0f009B1db933EbF280`
- `BinPositionManager`: `0x57D13FA23A308ADd3Bb78A0ff7e7663Ef9867b96`
- `BinQuoter`: `0x7a9758edFf23C3523c344c7FCAb48e700868331C`

**Status:** 🔴 **NOT INTEGRATED**

Although the Bin contracts are deployed and verified, they are **not currently used** in the frontend application. All liquidity and swap functionality is handled by the Concentrated Liquidity (CL) contracts.

### UI Integration

- None

### Frontend Logic

- None

### Contract Interaction

- None

---

## 7. CLPositionDescriptor

**Address:** `0xd5Ee30B2344fAb565606b75BCAca43480719fee4`  
**Purpose:** Generates on-chain SVG and metadata for liquidity position NFTs.

### UI Integration

- **Component:** `PositionCard.tsx` (hypothetical, for viewing user positions)

**User Actions:**
- When a user views their liquidity positions (NFTs), the frontend would display an image and details for each position.

### Frontend Logic

- **File:** `positions.ts` (hypothetical)

**Workflow:**
1. The frontend would call the `tokenURI()` function on the `CLPositionManager` NFT contract.
2. This function, in turn, calls the `CLPositionDescriptor` to get the metadata URL.
3. The frontend fetches the metadata (which includes an SVG image) and displays it.

### Contract Interaction

- **Contract:** `CLPositionDescriptorOffChain.sol`
- **Function:** `constructTokenURI(ConstructTokenURIParams calldata params)`

**Parameters:**
- `params`: Struct containing all details of the liquidity position needed to render the SVG.

---

## Summary of Contract Interactions

| Feature | UI Component | Frontend Logic | Primary Contract | Secondary Contracts |
|---|---|---|---|---|
| **Swap** | `SwapWidget.tsx` | `swap.ts` | `UniversalRouter` | `CLQuoter`, `CLPoolManager`, `Vault` |
| **Add Liquidity** | `AddLiquidity.tsx` | `liquidity.ts` | `CLPositionManager` | `CLPoolManager`, `Vault` |
| **View Pools** | `PoolBrowser.tsx` | `pools.ts` | `CLPoolManager` | - |
| **View Positions** | `PositionCard.tsx` | `positions.ts` | `CLPositionManager` | `CLPositionDescriptor` |

---

**Document Generated:** November 19, 2025
