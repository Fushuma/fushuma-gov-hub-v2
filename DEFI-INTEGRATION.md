# DeFi Integration Guide

This document describes the integration of FuDEFI components into the Fushuma Governance Hub V2.

## Overview

The Fushuma Governance Hub V2 now includes a complete DeFi suite integrated from the FuDEFI application, providing users with a unified platform for both governance and decentralized finance operations.

## Integrated DeFi Features

### 1. **Swap** (`/defi/swap`)
Token swapping interface with:
- Token selection and search
- Price impact calculation
- Slippage settings
- Transaction routing
- Safe trading scores

### 2. **Liquidity** (`/defi/liquidity`)
Liquidity pool management:
- Add liquidity to pools
- Remove liquidity
- View your liquidity positions
- Liquidity charts and analytics
- Pool history tracking

### 3. **Farms** (`/defi/farms`)
Yield farming interface:
- Stake LP tokens
- Unstake LP tokens
- View farm APR/APY
- Claim rewards
- ROI calculator

### 4. **Staking** (`/defi/staking`)
Single-asset staking:
- Stake tokens
- Unstake tokens
- View staking rewards
- Compound earnings

### 5. **Migrate** (`/defi/migrate`)
Migration tools for:
- Migrating liquidity between versions
- Token migrations
- Pool migrations

### 6. **Launchpads** (`/defi/launchpads`)
Project launchpad for:
- New token launches
- Presales
- Fair launches
- Multi-chain support

## Architecture

### Directory Structure

```
src/
├── app/
│   └── defi/                    # DeFi pages
│       ├── swap/
│       ├── liquidity/
│       ├── farms/
│       ├── staking/
│       ├── migrate/
│       └── launchpads/
├── components/
│   └── defi/                    # DeFi components
│       ├── Header.tsx
│       ├── HeaderNav.tsx
│       ├── Footer.tsx
│       ├── TokenSelector.tsx
│       ├── WalletMenu.tsx
│       └── ... (other components)
└── lib/
    └── defi/                    # DeFi utilities
        ├── hooks/               # Custom hooks
        ├── config/              # Configuration
        ├── utils/               # Utility functions
        ├── stores/              # Zustand stores
        └── providers/           # Context providers
```

### Navigation Integration

The main navigation has been updated to include DeFi features in a dropdown menu:

```
Governance
  ├── Proposals
  ├── Grants
  └── Launchpad

DeFi
  ├── Swap
  ├── Liquidity
  ├── Farms
  └── Staking
```

## Dependencies Added

The following DeFi-specific dependencies have been integrated:

```json
{
  "@callisto-enterprise/soy-sdk": "^0.1.7",
  "@floating-ui/react": "^0.27.16",
  "@uniswap/v3-core": "^1.0.1",
  "@uniswap/v3-periphery": "^1.4.3",
  "@uniswap/v3-sdk": "^3.10.0",
  "chart.js": "^4.5.0",
  "chartjs-adapter-date-fns": "^3.0.0",
  "ethers": "^5.7.2",
  "graphql-request": "^7.2.0",
  "jsbi": "^4.3.0",
  "react-chartjs-2": "^5.3.0",
  "react-number-format": "^5.4.4",
  "react-responsive": "^10.0.1",
  "simplebar-react": "^3.3.2",
  "zustand": "^5.0.8"
}
```

## Configuration

### Network Configuration

The DeFi components are configured to work with the Fushuma Network (Chain ID: 121224). Configuration files are located in:

```
src/lib/defi/config/
├── networks.ts          # Network configurations
├── tokens.ts            # Token lists
└── pools.ts             # Pool configurations
```

### State Management

DeFi features use Zustand for state management:

```typescript
// Example: Swap store
import { useSwapTokensStore } from '@/lib/defi/stores';

const { tokenFrom, tokenTo, setTokenFrom, setTokenTo } = useSwapTokensStore();
```

## Usage

### Accessing DeFi Features

Users can access DeFi features through:

1. **Navigation Menu**: Click "DeFi" in the main navigation
2. **Direct URLs**: Navigate to `/defi/swap`, `/defi/liquidity`, etc.
3. **Home Page**: Links to DeFi features on the homepage

### Wallet Connection

DeFi features require wallet connection via RainbowKit:
- Connect wallet using the "Connect Wallet" button
- Ensure you're on the Fushuma Network (Chain ID: 121224)
- If on wrong network, you'll be prompted to switch

## Development

### Adding New DeFi Features

To add new DeFi features:

1. Create a new page in `src/app/defi/[feature]/page.tsx`
2. Add components in `src/components/defi/[feature]/`
3. Add hooks/utilities in `src/lib/defi/hooks/` or `src/lib/defi/utils/`
4. Update navigation in `src/components/layout/Navigation.tsx`

### Customizing DeFi Components

DeFi components can be customized by:

1. Modifying component files in `src/components/defi/`
2. Updating styles in component files (using Tailwind CSS)
3. Adjusting configuration in `src/lib/defi/config/`

## Integration Benefits

### Unified User Experience
- Single platform for governance and DeFi
- Consistent UI/UX across all features
- Shared wallet connection
- Unified navigation

### Code Sharing
- Shared Web3 configuration (wagmi, viem)
- Shared UI components (Radix UI, Tailwind)
- Shared utilities and helpers
- Shared authentication

### Performance
- Server-side rendering for better SEO
- Optimized bundle splitting
- Shared dependencies reduce bundle size
- Next.js optimizations

## Future Enhancements

Planned improvements for the DeFi integration:

1. **Analytics Dashboard**: Unified analytics for governance and DeFi activities
2. **Cross-Feature Integration**: Link governance proposals to DeFi actions
3. **Advanced Charts**: More detailed charts and analytics
4. **Mobile Optimization**: Enhanced mobile experience
5. **Multi-Language Support**: Internationalization for DeFi features

## Support

For issues or questions related to DeFi features:

1. Check the [main README](./README.md)
2. Review the [deployment guide](./DEPLOYMENT.md)
3. Open an issue on GitHub

## Security Considerations

- All DeFi interactions require wallet signatures
- Smart contract addresses are configured in `src/lib/defi/config/`
- Always verify transaction details before signing
- Use hardware wallets for large amounts
- Never share your private keys or seed phrases

---

**Note**: The DeFi integration maintains all security best practices from the original FuDEFI application while benefiting from the enhanced architecture of the governance hub.

