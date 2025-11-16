# DeFi Integration Guide - FumaSwap V4

**Last Updated:** November 16, 2025

This document describes the integration of FumaSwap V4 into the Fushuma Governance Hub V2.

## Overview

The Fushuma Governance Hub V2 now includes a complete DeFi suite powered by FumaSwap V4, a decentralized exchange based on a modified PancakeSwap V4. This provides users with a unified platform for both governance and decentralized finance operations.

## Deployed Contracts

All FumaSwap V4 contracts have been deployed to the Fushuma Mainnet. The addresses are configured in `src/lib/fumaswap/contracts.ts`.

| Contract | Address |
|---|---|
| **Vault** | `0x4FB212Ed5038b0EcF2c8322B3c71FC64d66073A1` |
| **CLPoolManager** | `0x9123DeC6d2bE7091329088BA1F8Dc118eEc44f7a` |
| **BinPoolManager** | `0x3014809fBFF942C485A9F527242eC7C5A9ddC765` |
| **FumaInfinityRouter** | `0x9E98f794bd1c4161898013fa0DEE406B7b06aB6B` |
| **CLPositionManager** | `0x411755EeC7BaA85F8d6819189FE15d966F41Ad85` |
| **Permit2** | `0x1d5E963f9581F5416Eae6C9978246B7dDf559Ff0` |

## Integrated DeFi Features

- **Swap** (`/defi/fumaswap/swap`): Token swapping with real-time quotes.
- **Liquidity** (`/defi/fumaswap/liquidity`): Liquidity pool management.
- **Positions** (`/defi/fumaswap/positions`): View and manage your LP positions.
- **Pools** (`/defi/fumaswap/pools`): Browse available liquidity pools.

## Architecture

- **Pages**: `src/app/defi/fumaswap/`
- **Components**: `src/components/defi/`
- **Logic & ABIs**: `src/lib/fumaswap/`

## How to Use

1. **Connect Wallet**: Connect your wallet on the Fushuma Governance Hub.
2. **Navigate to DeFi**: Use the "DeFi" tab to access FumaSwap features.
3. **Swap, Add Liquidity, Manage Positions**: Use the intuitive interface to interact with the DEX.

## Security

- All transactions require wallet signatures.
- The contracts have been modified for Paris EVM compatibility but have **NOT been audited**.
- Use at your own risk, especially with real funds.
