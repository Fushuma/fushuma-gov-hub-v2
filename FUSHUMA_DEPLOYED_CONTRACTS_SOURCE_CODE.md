# Fushuma DeFi - Deployed Smart Contracts Source Code

**Date:** November 19, 2025  
**Solidity Version:** 0.8.20  
**EVM Version:** Shanghai  
**Network:** Fushuma Mainnet (Chain ID: 121224)

---

## Table of Contents

### Core Contracts (Deployed Nov 18, 2025)
1. [Vault](#1-vault)
2. [CLPoolManager](#2-clpoolmanager)
3. [BinPoolManager](#3-binpoolmanager)

### Periphery Contracts - Concentrated Liquidity (Deployed Nov 19, 2025)
4. [CLPositionManager](#4-clpositionmanager)
5. [CLQuoter](#5-clquoter)
6. [CLPositionDescriptor](#6-clpositiondescriptor)

### Periphery Contracts - Bin Pools (Deployed Nov 19, 2025)
7. [BinPositionManager](#7-binpositionmanager)
8. [BinQuoter](#8-binquoter)

### Router Contracts (Deployed Nov 18, 2025)
9. [UniversalRouter](#9-universalrouter)
10. [MixedQuoter](#10-mixedquoter)

---

## Deployment Information

| Contract | Address | Deployment Date | Bytecode Size | Status |
|----------|---------|-----------------|---------------|--------|
| **Vault** | `0xcf842B77660ccEBD24fB3f860Ab2304c5B9F5A4E` | Nov 18, 2025 | 12,295 bytes | ✅ Verified |
| **CLPoolManager** | `0xef02f995FEC090E21709A7eBAc2197d249B1a605` | Nov 18, 2025 | 32,783 bytes | ✅ Verified |
| **BinPoolManager** | `0xCF6C0074c43C00234cC83D0f009B1db933EbF280` | Nov 18, 2025 | 38,727 bytes | ✅ Verified |
| **CLPositionManager** | `0xF354672DD5c502567a5Af784d91f1a735559D2aC` | Nov 19, 2025 | 39,417 bytes | ✅ Verified |
| **CLQuoter** | `0x8197a04498bee6212aF4Ef5A647f35FF8Ff6841b` | Nov 19, 2025 | 10,379 bytes | ✅ Verified |
| **CLPositionDescriptor** | `0xd5Ee30B2344fAb565606b75BCAca43480719fee4` | Nov 19, 2025 | 4,345 bytes | ✅ Verified |
| **BinPositionManager** | `0x57D13FA23A308ADd3Bb78A0ff7e7663Ef9867b96` | Nov 19, 2025 | 25,603 bytes | ✅ Verified |
| **BinQuoter** | `0x7a9758edFf23C3523c344c7FCAb48e700868331C` | Nov 19, 2025 | 10,271 bytes | ✅ Verified |
| **UniversalRouter** | `0x9a554202Ff6E62e5533D394330D0A4B57efF7C7a` | Nov 18, 2025 | 40,743 bytes | ✅ Verified |
| **MixedQuoter** | `0x82b5d24754AAB72AbF2D4025Cb58F8321c3d0305` | Nov 18, 2025 | 25,775 bytes | ✅ Verified |

---

## Known Issues

⚠️ **CRITICAL BUGS IDENTIFIED:**

1. **Decimal Mismatch Bug** - USDT/USDC (6 decimals) calculations may be incorrect, causing users to receive 10^12 times less tokens than expected
2. **Pool Initialization Issue** - Pools cannot be initialized despite appearing uninitialized

**Status:** Platform NOT production ready until bugs are fixed

---

## 1. Vault

**Address:** `0xcf842B77660ccEBD24fB3f860Ab2304c5B9F5A4E`  
**Deployed:** November 18, 2025  
**File:** `src/infinity-core/Vault.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity 0.8.20;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IVault, IVaultToken} from "./interfaces/IVault.sol";
import {SettlementGuard} from "./libraries/SettlementGuard.sol";
import {Currency, CurrencyLibrary} from "./types/Currency.sol";
import {BalanceDelta} from "./types/BalanceDelta.sol";
import {ILockCallback} from "./interfaces/ILockCallback.sol";
import {SafeCast} from "./libraries/SafeCast.sol";
import {VaultReserve} from "./libraries/VaultReserve.sol";
import {VaultToken} from "./VaultToken.sol";

contract Vault is IVault, VaultToken, Ownable2Step {
    using SafeCast for *;
    using CurrencyLibrary for Currency;

    constructor() Ownable(msg.sender) {}

    mapping(address app => bool isRegistered) public override isAppRegistered;

    /// @dev keep track of each app's reserves
    mapping(address app => mapping(Currency currency => uint256 reserve)) public reservesOfApp;

    /// @notice only registered app is allowed to perform accounting
    modifier onlyRegisteredApp() {
        if (!isAppRegistered[msg.sender]) revert AppUnregistered();

        _;
    }

    /// @notice revert if no locker is set
    modifier isLocked() {
        if (SettlementGuard.getLocker() == address(0)) revert NoLocker();
        _;
    }

    /// @inheritdoc IVault
    function registerApp(address app) external override onlyOwner {
        isAppRegistered[app] = true;

        emit AppRegistered(app);
    }

    /// @inheritdoc IVault
    function getLocker() external view override returns (address) {
        return SettlementGuard.getLocker();
    }

    /// @inheritdoc IVault
    function getUnsettledDeltasCount() external view override returns (uint256) {
        return SettlementGuard.getUnsettledDeltasCount();
    }

    /// @inheritdoc IVault
    function currencyDelta(address settler, Currency currency) external view override returns (int256) {
        return SettlementGuard.getCurrencyDelta(settler, currency);
    }

    /// @dev interaction must start from lock
    /// @inheritdoc IVault
    function lock(bytes calldata data) external override returns (bytes memory result) {
        /// @dev only one locker at a time
        SettlementGuard.setLocker(msg.sender);

        result = ILockCallback(msg.sender).lockAcquired(data);
        /// @notice the caller can do anything in this callback as long as all deltas are offset after this
        if (SettlementGuard.getUnsettledDeltasCount() != 0) revert CurrencyNotSettled();

        /// @dev release the lock
        SettlementGuard.setLocker(address(0));
    }

    /// @inheritdoc IVault
    function accountAppBalanceDelta(
        Currency currency0,
        Currency currency1,
        BalanceDelta delta,
        address settler,
        BalanceDelta hookDelta,
        address hook
    ) external override isLocked onlyRegisteredApp {
        (int128 delta0, int128 delta1) = (delta.amount0(), delta.amount1());
        (int128 hookDelta0, int128 hookDelta1) = (hookDelta.amount0(), hookDelta.amount1());

        /// @dev call _accountDeltaForApp once with both delta/hookDelta to save gas and prevent
        /// reservesOfApp from underflow when it deduct before addition
        _accountDeltaForApp(currency0, delta0 + hookDelta0);
        _accountDeltaForApp(currency1, delta1 + hookDelta1);

        // keep track of the balance on vault level
        SettlementGuard.accountDelta(settler, currency0, delta0);
        SettlementGuard.accountDelta(settler, currency1, delta1);
        SettlementGuard.accountDelta(hook, currency0, hookDelta0);
        SettlementGuard.accountDelta(hook, currency1, hookDelta1);
    }

    /// @inheritdoc IVault
    function accountAppBalanceDelta(Currency currency0, Currency currency1, BalanceDelta delta, address settler)
        external
        override
        isLocked
        onlyRegisteredApp
    {
        int128 delta0 = delta.amount0();
        int128 delta1 = delta.amount1();

        // keep track of the balance on app level
        _accountDeltaForApp(currency0, delta0);
        _accountDeltaForApp(currency1, delta1);

        // keep track of the balance on vault level
        SettlementGuard.accountDelta(settler, currency0, delta0);
        SettlementGuard.accountDelta(settler, currency1, delta1);
    }

    /// @inheritdoc IVault
    function accountAppBalanceDelta(Currency currency, int128 delta, address settler)
        external
        override
        isLocked
        onlyRegisteredApp
    {
        _accountDeltaForApp(currency, delta);
        SettlementGuard.accountDelta(settler, currency, delta);
    }

    /// @inheritdoc IVault
    function take(Currency currency, address to, uint256 amount) external override isLocked {
        unchecked {
            SettlementGuard.accountDelta(msg.sender, currency, -(amount.toInt128()));
            currency.transfer(to, amount);
        }
    }

    /// @inheritdoc IVault
    function mint(address to, Currency currency, uint256 amount) external override isLocked {
        unchecked {
            SettlementGuard.accountDelta(msg.sender, currency, -(amount.toInt128()));
            _mint(to, currency, amount);
        }
    }

    function sync(Currency currency) public override {
        if (currency.isNative()) {
            VaultReserve.setVaultReserve(CurrencyLibrary.NATIVE, 0);
        } else {
            uint256 balance = currency.balanceOfSelf();
            VaultReserve.setVaultReserve(currency, balance);
        }
    }

    /// @inheritdoc IVault
    function settle() external payable override isLocked returns (uint256) {
        return _settle(msg.sender);
    }

    /// @inheritdoc IVault
    function settleFor(address recipient) external payable override isLocked returns (uint256) {
        return _settle(recipient);
    }

    /// @inheritdoc IVault
    function clear(Currency currency, uint256 amount) external isLocked {
        int256 existingDelta = SettlementGuard.getCurrencyDelta(msg.sender, currency);
        int128 amountDelta = amount.toInt128();
        /// @dev since amount is uint256, existingDelta must be positive otherwise revert
        if (amountDelta != existingDelta) revert MustClearExactPositiveDelta();
        unchecked {
            SettlementGuard.accountDelta(msg.sender, currency, -amountDelta);
        }
    }

    /// @inheritdoc IVault
    function burn(address from, Currency currency, uint256 amount) external override isLocked {
        SettlementGuard.accountDelta(msg.sender, currency, amount.toInt128());
        _burnFrom(from, currency, amount);
    }

    /// @inheritdoc IVault
    function collectFee(Currency currency, uint256 amount, address recipient) external onlyRegisteredApp {
        // prevent transfer between the sync and settle balanceOfs (native settle uses msg.value)
        (Currency syncedCurrency,) = VaultReserve.getVaultReserve();
        if (!currency.isNative() && syncedCurrency == currency) revert FeeCurrencySynced();
        reservesOfApp[msg.sender][currency] -= amount;
        currency.transfer(recipient, amount);
    }

    /// @inheritdoc IVault
    function getVaultReserve() external view returns (Currency, uint256) {
        return VaultReserve.getVaultReserve();
    }

    function _accountDeltaForApp(Currency currency, int128 delta) internal {
        if (delta == 0) return;

        /// @dev optimization: msg.sender will always be app address, verification should be done on caller address
        if (delta >= 0) {
            /// @dev arithmetic underflow make sure trader can't withdraw too much from app
            reservesOfApp[msg.sender][currency] -= uint128(delta);
        } else {
            /// @dev arithmetic overflow make sure trader won't deposit too much into app
            reservesOfApp[msg.sender][currency] += uint128(-delta);
        }
    }

    // if settling native, integrators should still call `sync` first to avoid DoS attack vectors
    function _settle(address recipient) internal returns (uint256 paid) {
        (Currency currency, uint256 reservesBefore) = VaultReserve.getVaultReserve();
        if (!currency.isNative()) {
            if (msg.value > 0) revert SettleNonNativeCurrencyWithValue();
            uint256 reservesNow = currency.balanceOfSelf();
            paid = reservesNow - reservesBefore;

            /// @dev reset the reserve after settled
            VaultReserve.setVaultReserve(CurrencyLibrary.NATIVE, 0);
        } else {
            // NATIVE token does not require sync call before settle
            paid = msg.value;
        }

        SettlementGuard.accountDelta(recipient, currency, paid.toInt128());
    }
}
```

---

## 2. CLPoolManager

**Address:** `0xef02f995FEC090E21709A7eBAc2197d249B1a605`  
**Deployed:** November 18, 2025  
**File:** `src/infinity-core/pool-cl/CLPoolManager.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity 0.8.20;

import {ProtocolFees} from "../ProtocolFees.sol";
import {ICLPoolManager} from "./interfaces/ICLPoolManager.sol";
import {IVault} from "../interfaces/IVault.sol";
import {PoolId} from "../types/PoolId.sol";
import {CLPool} from "./libraries/CLPool.sol";
import {CLPosition} from "./libraries/CLPosition.sol";
import {PoolKey} from "../types/PoolKey.sol";
import {IPoolManager} from "../interfaces/IPoolManager.sol";
import {Hooks} from "../libraries/Hooks.sol";
import {Tick} from "./libraries/Tick.sol";
import {CLPoolParametersHelper} from "./libraries/CLPoolParametersHelper.sol";
import {ParametersHelper} from "../libraries/math/ParametersHelper.sol";
import {LPFeeLibrary} from "../libraries/LPFeeLibrary.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "../types/BalanceDelta.sol";
import {Extsload} from "../Extsload.sol";
import {SafeCast} from "../libraries/SafeCast.sol";
import {CLPoolGetters} from "./libraries/CLPoolGetters.sol";
import {CLHooks} from "./libraries/CLHooks.sol";
import {BeforeSwapDelta} from "../types/BeforeSwapDelta.sol";
import {Currency} from "../types/Currency.sol";
import {TickMath} from "./libraries/TickMath.sol";
import {CLSlot0} from "./types/CLSlot0.sol";
import {VaultAppDeltaSettlement} from "../libraries/VaultAppDeltaSettlement.sol";

contract CLPoolManager is ICLPoolManager, ProtocolFees, Extsload {
    using SafeCast for int256;
    using Hooks for bytes32;
    using LPFeeLibrary for uint24;
    using CLPoolParametersHelper for bytes32;
    using CLPool for *;
    using CLPosition for mapping(bytes32 => CLPosition.Info);
    using CLPoolGetters for CLPool.State;
    using VaultAppDeltaSettlement for IVault;

    mapping(PoolId id => CLPool.State poolState) private pools;

    mapping(PoolId id => PoolKey poolKey) public poolIdToPoolKey;

    constructor(IVault _vault) ProtocolFees(_vault) {}

    /// @notice pool manager specified in the pool key must match current contract
    modifier poolManagerMatch(address poolManager) {
        if (address(this) != poolManager) revert PoolManagerMismatch();
        _;
    }

    /// @inheritdoc ICLPoolManager
    function getSlot0(PoolId id)
        external
        view
        override
        returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)
    {
        CLSlot0 slot0 = pools[id].slot0;
        return (slot0.sqrtPriceX96(), slot0.tick(), slot0.protocolFee(), slot0.lpFee());
    }

    /// @inheritdoc ICLPoolManager
    function getLiquidity(PoolId id) external view override returns (uint128 liquidity) {
        return pools[id].liquidity;
    }

    /// @inheritdoc ICLPoolManager
    function getLiquidity(PoolId id, address _owner, int24 tickLower, int24 tickUpper, bytes32 salt)
        external
        view
        override
        returns (uint128 liquidity)
    {
        return pools[id].positions.get(_owner, tickLower, tickUpper, salt).liquidity;
    }

    /// @inheritdoc ICLPoolManager
    function getPosition(PoolId id, address owner, int24 tickLower, int24 tickUpper, bytes32 salt)
        external
        view
        override
        returns (CLPosition.Info memory position)
    {
        return pools[id].positions.get(owner, tickLower, tickUpper, salt);
    }

    /// @inheritdoc ICLPoolManager
    function initialize(PoolKey memory key, uint160 sqrtPriceX96)
        external
        override
        poolManagerMatch(address(key.poolManager))
        returns (int24 tick)
    {
        int24 tickSpacing = key.parameters.getTickSpacing();
        if (tickSpacing > TickMath.MAX_TICK_SPACING) revert TickSpacingTooLarge(tickSpacing);
        if (tickSpacing < TickMath.MIN_TICK_SPACING) revert TickSpacingTooSmall(tickSpacing);
        if (key.currency0 >= key.currency1) {
            revert CurrenciesInitializedOutOfOrder(Currency.unwrap(key.currency0), Currency.unwrap(key.currency1));
        }

        ParametersHelper.checkUnusedBitsAllZero(
            key.parameters, CLPoolParametersHelper.OFFSET_MOST_SIGNIFICANT_UNUSED_BITS
        );
        Hooks.validateHookConfig(key);
        CLHooks.validatePermissionsConflict(key);

        /// @notice init value for dynamic lp fee is 0, but hook can still set it in afterInitialize
        uint24 lpFee = key.fee.getInitialLPFee();
        lpFee.validate(LPFeeLibrary.ONE_HUNDRED_PERCENT_FEE);

        CLHooks.beforeInitialize(key, sqrtPriceX96);

        PoolId id = key.toId();
        uint24 protocolFee = _fetchProtocolFee(key);
        tick = pools[id].initialize(sqrtPriceX96, protocolFee, lpFee);

        poolIdToPoolKey[id] = key;

        /// @notice Make sure the first event is noted, so that later events from afterHook won't get mixed up with this one
        emit Initialize(id, key.currency0, key.currency1, key.hooks, key.fee, key.parameters, sqrtPriceX96, tick);

        CLHooks.afterInitialize(key, sqrtPriceX96, tick);
    }

    /// @inheritdoc ICLPoolManager
    function modifyLiquidity(
        PoolKey memory key,
        ICLPoolManager.ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external override returns (BalanceDelta delta, BalanceDelta feeDelta) {
        // Do not allow add liquidity when paused()
        if (params.liquidityDelta > 0 && paused()) revert PoolPaused();

        PoolId id = key.toId();
        CLPool.State storage pool = pools[id];
        pool.checkPoolInitialized();

        CLHooks.beforeModifyLiquidity(key, params, hookData);

        (delta, feeDelta) = pool.modifyLiquidity(
            CLPool.ModifyLiquidityParams({
                owner: msg.sender,
                tickLower: params.tickLower,
                tickUpper: params.tickUpper,
                liquidityDelta: params.liquidityDelta.toInt128(),
                tickSpacing: key.parameters.getTickSpacing(),
                salt: params.salt
            })
        );

        /// @notice Make sure the first event is noted, so that later events from afterHook won't get mixed up with this one
        emit ModifyLiquidity(id, msg.sender, params.tickLower, params.tickUpper, params.liquidityDelta, params.salt);

        BalanceDelta hookDelta;
        // notice that both generated delta and feeDelta (from lpFee) will both be counted on the user
        (delta, hookDelta) = CLHooks.afterModifyLiquidity(key, params, delta + feeDelta, feeDelta, hookData);

        vault.accountAppDeltaWithHookDelta(key, delta, hookDelta);
    }

    /// @inheritdoc ICLPoolManager
    function swap(PoolKey memory key, ICLPoolManager.SwapParams memory params, bytes calldata hookData)
        external
        override
        whenNotPaused
        returns (BalanceDelta delta)
    {
        if (params.amountSpecified == 0) revert SwapAmountCannotBeZero();

        PoolId id = key.toId();
        CLPool.State storage pool = pools[id];
        pool.checkPoolInitialized();

        (int256 amountToSwap, BeforeSwapDelta beforeSwapDelta, uint24 lpFeeOverride) =
            CLHooks.beforeSwap(key, params, hookData);
        CLPool.SwapState memory state;
        (delta, state) = pool.swap(
            CLPool.SwapParams({
                tickSpacing: key.parameters.getTickSpacing(),
                zeroForOne: params.zeroForOne,
                amountSpecified: amountToSwap,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96,
                lpFeeOverride: lpFeeOverride
            })
        );

        unchecked {
            if (state.feeAmountToProtocol > 0) {
                protocolFeesAccrued[params.zeroForOne ? key.currency0 : key.currency1] += state.feeAmountToProtocol;
            }
        }

        /// @notice Make sure the first event is noted, so that later events from afterHook won't get mixed up with this one
        emit Swap(
            id,
            msg.sender,
            delta.amount0(),
            delta.amount1(),
            state.sqrtPriceX96,
            state.liquidity,
            state.tick,
            state.swapFee,
            state.protocolFee
        );

        BalanceDelta hookDelta;

        /// @dev delta already includes protocol fee
        (delta, hookDelta) = CLHooks.afterSwap(key, params, delta, hookData, beforeSwapDelta);

        vault.accountAppDeltaWithHookDelta(key, delta, hookDelta);
    }

    /// @inheritdoc ICLPoolManager
    function donate(PoolKey memory key, uint256 amount0, uint256 amount1, bytes calldata hookData)
        external
        override
        whenNotPaused
        returns (BalanceDelta delta)
    {
        PoolId id = key.toId();
        CLPool.State storage pool = pools[id];
        pool.checkPoolInitialized();

        CLHooks.beforeDonate(key, amount0, amount1, hookData);

        int24 tick;
        (delta, tick) = pool.donate(amount0, amount1);
        vault.accountAppBalanceDelta(key.currency0, key.currency1, delta, msg.sender);

        /// @notice Make sure the first event is noted, so that later events from afterHook won't get mixed up with this one
        emit Donate(id, msg.sender, amount0, amount1, tick);

        CLHooks.afterDonate(key, amount0, amount1, hookData);
    }

    function getPoolTickInfo(PoolId id, int24 tick) external view returns (Tick.Info memory) {
        return pools[id].getPoolTickInfo(tick);
    }

    function getPoolBitmapInfo(PoolId id, int16 word) external view returns (uint256 tickBitmap) {
        return pools[id].getPoolBitmapInfo(word);
    }

    function getFeeGrowthGlobals(PoolId id)
        external
        view
        returns (uint256 feeGrowthGlobal0x128, uint256 feeGrowthGlobal1x128)
    {
        return pools[id].getFeeGrowthGlobals();
    }

    /// @inheritdoc IPoolManager
    function updateDynamicLPFee(PoolKey memory key, uint24 newDynamicLPFee) external override {
        if (!key.fee.isDynamicLPFee() || msg.sender != address(key.hooks)) revert UnauthorizedDynamicLPFeeUpdate();
        newDynamicLPFee.validate(LPFeeLibrary.ONE_HUNDRED_PERCENT_FEE);

        PoolId id = key.toId();
        pools[id].setLPFee(newDynamicLPFee);
        emit DynamicLPFeeUpdated(id, newDynamicLPFee);
    }

    function _setProtocolFee(PoolId id, uint24 newProtocolFee) internal override {
        pools[id].setProtocolFee(newProtocolFee);
    }

    /// @notice not accept ether
    // receive() external payable {}
    // fallback() external payable {}
}
```

---

## 3. BinPoolManager

**Address:** `0xCF6C0074c43C00234cC83D0f009B1db933EbF280`  
**Deployed:** November 18, 2025  
**File:** `src/infinity-core/pool-bin/BinPoolManager.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity 0.8.20;

import {ProtocolFees} from "../ProtocolFees.sol";
import {Hooks} from "../libraries/Hooks.sol";
import {BinPool} from "./libraries/BinPool.sol";
import {BinPoolParametersHelper} from "./libraries/BinPoolParametersHelper.sol";
import {ParametersHelper} from "../libraries/math/ParametersHelper.sol";
import {Currency, CurrencyLibrary} from "../types/Currency.sol";
import {IPoolManager} from "../interfaces/IPoolManager.sol";
import {IBinPoolManager} from "./interfaces/IBinPoolManager.sol";
import {PoolId} from "../types/PoolId.sol";
import {PoolKey} from "../types/PoolKey.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "../types/BalanceDelta.sol";
import {IVault} from "../interfaces/IVault.sol";
import {BinPosition} from "./libraries/BinPosition.sol";
import {LPFeeLibrary} from "../libraries/LPFeeLibrary.sol";
import {PackedUint128Math} from "./libraries/math/PackedUint128Math.sol";
import {Extsload} from "../Extsload.sol";
import {BinHooks} from "./libraries/BinHooks.sol";
import {PriceHelper} from "./libraries/PriceHelper.sol";
import {BeforeSwapDelta} from "../types/BeforeSwapDelta.sol";
import {BinSlot0} from "./types/BinSlot0.sol";
import {VaultAppDeltaSettlement} from "../libraries/VaultAppDeltaSettlement.sol";

/// @notice Holds the state for all bin pools
contract BinPoolManager is IBinPoolManager, ProtocolFees, Extsload {
    using BinPool for *;
    using BinPosition for mapping(bytes32 => BinPosition.Info);
    using BinPoolParametersHelper for bytes32;
    using LPFeeLibrary for uint24;
    using PackedUint128Math for bytes32;
    using Hooks for bytes32;
    using VaultAppDeltaSettlement for IVault;

    /// @inheritdoc IBinPoolManager
    uint16 public constant override MIN_BIN_STEP = 1;

    /// @inheritdoc IBinPoolManager
    uint16 public override maxBinStep = 100;

    /// @inheritdoc IBinPoolManager
    uint256 public override minBinShareForDonate = 2 ** 128;

    mapping(PoolId id => BinPool.State poolState) public pools;

    mapping(PoolId id => PoolKey poolKey) public poolIdToPoolKey;

    constructor(IVault vault) ProtocolFees(vault) {}

    /// @notice pool manager specified in the pool key must match current contract
    modifier poolManagerMatch(address poolManager) {
        if (address(this) != poolManager) revert PoolManagerMismatch();
        _;
    }

    /// @inheritdoc IBinPoolManager
    function getSlot0(PoolId id) external view override returns (uint24 activeId, uint24 protocolFee, uint24 lpFee) {
        BinSlot0 slot0 = pools[id].slot0;

        return (slot0.activeId(), slot0.protocolFee(), slot0.lpFee());
    }

    /// @inheritdoc IBinPoolManager
    function getBin(PoolId id, uint24 binId)
        external
        view
        override
        returns (uint128 binReserveX, uint128 binReserveY, uint256 binLiquidity, uint256 totalShares)
    {
        PoolKey memory key = poolIdToPoolKey[id];
        (binReserveX, binReserveY, binLiquidity, totalShares) = pools[id].getBin(key.parameters.getBinStep(), binId);
    }

    /// @inheritdoc IBinPoolManager
    function getPosition(PoolId id, address owner, uint24 binId, bytes32 salt)
        external
        view
        override
        returns (BinPosition.Info memory position)
    {
        return pools[id].positions.get(owner, binId, salt);
    }

    /// @inheritdoc IBinPoolManager
    function getNextNonEmptyBin(PoolId id, bool swapForY, uint24 binId)
        external
        view
        override
        returns (uint24 nextId)
    {
        nextId = pools[id].getNextNonEmptyBin(swapForY, binId);
    }

    /// @inheritdoc IBinPoolManager
    function initialize(PoolKey memory key, uint24 activeId)
        external
        override
        poolManagerMatch(address(key.poolManager))
    {
        uint16 binStep = key.parameters.getBinStep();
        if (binStep < MIN_BIN_STEP) revert BinStepTooSmall(binStep);
        if (binStep > maxBinStep) revert BinStepTooLarge(binStep);
        if (key.currency0 >= key.currency1) {
            revert CurrenciesInitializedOutOfOrder(Currency.unwrap(key.currency0), Currency.unwrap(key.currency1));
        }

        // safety check, making sure that the price can be calculated
        PriceHelper.getPriceFromId(activeId, binStep);

        ParametersHelper.checkUnusedBitsAllZero(
            key.parameters, BinPoolParametersHelper.OFFSET_MOST_SIGNIFICANT_UNUSED_BITS
        );
        Hooks.validateHookConfig(key);
        BinHooks.validatePermissionsConflict(key);

        /// @notice init value for dynamic lp fee is 0, but hook can still set it in afterInitialize
        uint24 lpFee = key.fee.getInitialLPFee();
        lpFee.validate(LPFeeLibrary.TEN_PERCENT_FEE);

        BinHooks.beforeInitialize(key, activeId);

        PoolId id = key.toId();

        uint24 protocolFee = _fetchProtocolFee(key);
        pools[id].initialize(activeId, protocolFee, lpFee);

        poolIdToPoolKey[id] = key;

        /// @notice Make sure the first event is noted, so that later events from afterHook won't get mixed up with this one
        emit Initialize(id, key.currency0, key.currency1, key.hooks, key.fee, key.parameters, activeId);

        BinHooks.afterInitialize(key, activeId);
    }

    /// @inheritdoc IBinPoolManager
    function swap(PoolKey memory key, bool swapForY, int128 amountSpecified, bytes calldata hookData)
        external
        override
        whenNotPaused
        returns (BalanceDelta delta)
    {
        if (amountSpecified == 0) revert AmountSpecifiedIsZero();

        PoolId id = key.toId();
        BinPool.State storage pool = pools[id];
        pool.checkPoolInitialized();

        (int128 amountToSwap, BeforeSwapDelta beforeSwapDelta, uint24 lpFeeOverride) =
            BinHooks.beforeSwap(key, swapForY, amountSpecified, hookData);

        /// @dev fix stack too deep
        {
            BinPool.SwapState memory state;
            (delta, state) = pool.swap(
                BinPool.SwapParams({
                    swapForY: swapForY,
                    binStep: key.parameters.getBinStep(),
                    lpFeeOverride: lpFeeOverride,
                    amountSpecified: amountToSwap
                })
            );

            unchecked {
                if (state.feeAmountToProtocol > 0) {
                    protocolFeesAccrued[key.currency0] += state.feeAmountToProtocol.decodeX();
                    protocolFeesAccrued[key.currency1] += state.feeAmountToProtocol.decodeY();
                }
            }

            /// @notice Make sure the first event is noted, so that later events from afterHook won't get mixed up with this one
            emit Swap(
                id, msg.sender, delta.amount0(), delta.amount1(), state.activeId, state.swapFee, state.protocolFee
            );
        }

        BalanceDelta hookDelta;
        (delta, hookDelta) = BinHooks.afterSwap(key, swapForY, amountSpecified, delta, hookData, beforeSwapDelta);

        vault.accountAppDeltaWithHookDelta(key, delta, hookDelta);
    }

    /// @inheritdoc IBinPoolManager
    function mint(PoolKey memory key, IBinPoolManager.MintParams calldata params, bytes calldata hookData)
        external
        override
        whenNotPaused
        returns (BalanceDelta delta, BinPool.MintArrays memory mintArray)
    {
        PoolId id = key.toId();
        BinPool.State storage pool = pools[id];
        pool.checkPoolInitialized();

        (uint24 lpFeeOverride) = BinHooks.beforeMint(key, params, hookData);

        bytes32 feeAmountToProtocol;
        bytes32 compositionFeeAmount;
        (delta, feeAmountToProtocol, mintArray, compositionFeeAmount) = pool.mint(
            BinPool.MintParams({
                to: msg.sender,
                liquidityConfigs: params.liquidityConfigs,
                amountIn: params.amountIn,
                binStep: key.parameters.getBinStep(),
                lpFeeOverride: lpFeeOverride,
                salt: params.salt
            })
        );

        unchecked {
            if (feeAmountToProtocol > 0) {
                protocolFeesAccrued[key.currency0] += feeAmountToProtocol.decodeX();
                protocolFeesAccrued[key.currency1] += feeAmountToProtocol.decodeY();
            }
        }

        /// @notice Make sure the first event is noted, so that later events from afterHook won't get mixed up with this one
        emit Mint(
            id, msg.sender, mintArray.ids, params.salt, mintArray.amounts, compositionFeeAmount, feeAmountToProtocol
        );

        BalanceDelta hookDelta;
        (delta, hookDelta) = BinHooks.afterMint(key, params, delta, hookData);

        vault.accountAppDeltaWithHookDelta(key, delta, hookDelta);
    }

    /// @inheritdoc IBinPoolManager
    function burn(PoolKey memory key, IBinPoolManager.BurnParams memory params, bytes calldata hookData)
        external
        override
        returns (BalanceDelta delta)
    {
        PoolId id = key.toId();
        BinPool.State storage pool = pools[id];
        pool.checkPoolInitialized();

        BinHooks.beforeBurn(key, params, hookData);

        uint256[] memory binIds;
        bytes32[] memory amountRemoved;
        (delta, binIds, amountRemoved) = pool.burn(
            BinPool.BurnParams({
                from: msg.sender,
                ids: params.ids,
                amountsToBurn: params.amountsToBurn,
                salt: params.salt
            })
        );

        /// @notice Make sure the first event is noted, so that later events from afterHook won't get mixed up with this one
        emit Burn(id, msg.sender, binIds, params.salt, amountRemoved);

        BalanceDelta hookDelta;
        (delta, hookDelta) = BinHooks.afterBurn(key, params, delta, hookData);

        vault.accountAppDeltaWithHookDelta(key, delta, hookDelta);
    }

    function donate(PoolKey memory key, uint128 amount0, uint128 amount1, bytes calldata hookData)
        external
        override
        whenNotPaused
        returns (BalanceDelta delta, uint24 binId)
    {
        PoolId id = key.toId();
        BinPool.State storage pool = pools[id];
        pool.checkPoolInitialized();

        BinHooks.beforeDonate(key, amount0, amount1, hookData);

        /// @dev Share is 1:1 liquidity when liquidity is first added to bin
        uint256 currentBinShare = pool.shareOfBin[pool.slot0.activeId()];
        if (currentBinShare < minBinShareForDonate) {
            revert InsufficientBinShareForDonate(currentBinShare);
        }

        (delta, binId) = pool.donate(key.parameters.getBinStep(), amount0, amount1);

        vault.accountAppBalanceDelta(key.currency0, key.currency1, delta, msg.sender);

        /// @notice Make sure the first event is noted, so that later events from afterHook won't get mixed up with this one
        emit Donate(id, msg.sender, delta.amount0(), delta.amount1(), binId);

        BinHooks.afterDonate(key, amount0, amount1, hookData);
    }

    /// @inheritdoc IBinPoolManager
    function setMaxBinStep(uint16 newMaxBinStep) external override onlyOwner {
        if (newMaxBinStep <= MIN_BIN_STEP) revert MaxBinStepTooSmall(newMaxBinStep);

        maxBinStep = newMaxBinStep;
        emit SetMaxBinStep(newMaxBinStep);
    }

    /// @inheritdoc IBinPoolManager
    function setMinBinSharesForDonate(uint256 minBinShare) external override onlyOwner {
        minBinShareForDonate = minBinShare;
        emit SetMinBinSharesForDonate(minBinShare);
    }

    /// @inheritdoc IPoolManager
    function updateDynamicLPFee(PoolKey memory key, uint24 newDynamicLPFee) external override {
        if (!key.fee.isDynamicLPFee() || msg.sender != address(key.hooks)) revert UnauthorizedDynamicLPFeeUpdate();
        newDynamicLPFee.validate(LPFeeLibrary.TEN_PERCENT_FEE);

        PoolId id = key.toId();
        pools[id].setLPFee(newDynamicLPFee);
        emit DynamicLPFeeUpdated(id, newDynamicLPFee);
    }

    function _setProtocolFee(PoolId id, uint24 newProtocolFee) internal override {
        pools[id].setProtocolFee(newProtocolFee);
    }
}
```

---

## 4. CLPositionManager

**Address:** `0xF354672DD5c502567a5Af784d91f1a735559D2aC`  
**Deployed:** November 19, 2025  
**File:** `src/infinity-periphery/pool-cl/CLPositionManager.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity 0.8.20;

import {IVault} from "infinity-core/interfaces/IVault.sol";
import {Currency, CurrencyLibrary} from "infinity-core/types/Currency.sol";
import {BalanceDelta} from "infinity-core/types/BalanceDelta.sol";
import {ICLPoolManager} from "infinity-core/pool-cl/interfaces/ICLPoolManager.sol";
import {CLPosition} from "infinity-core/pool-cl/libraries/CLPosition.sol";
import {SafeCast} from "infinity-core/libraries/SafeCast.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {PoolIdLibrary} from "infinity-core/types/PoolId.sol";
import {PoolKey} from "infinity-core/types/PoolKey.sol";
import {PoolId} from "infinity-core/types/PoolId.sol";
import {IPositionManager} from "../interfaces/IPositionManager.sol";
import {BaseActionsRouter} from "../base/BaseActionsRouter.sol";
import {ReentrancyLock} from "../base/ReentrancyLock.sol";
import {DeltaResolver} from "../base/DeltaResolver.sol";
import {Permit2Forwarder} from "../base/Permit2Forwarder.sol";
import {ICLPositionManager} from "./interfaces/ICLPositionManager.sol";
import {CalldataDecoder} from "../libraries/CalldataDecoder.sol";
import {CLCalldataDecoder} from "./libraries/CLCalldataDecoder.sol";
import {Actions} from "../libraries/Actions.sol";
import {ERC721Permit} from "./base/ERC721Permit.sol";
import {SlippageCheck} from "../libraries/SlippageCheck.sol";
import {Multicall} from "../base/Multicall.sol";
import {CLNotifier} from "./base/CLNotifier.sol";
import {CLPositionInfo, CLPositionInfoLibrary} from "./libraries/CLPositionInfoLibrary.sol";
import {ICLSubscriber} from "./interfaces/ICLSubscriber.sol";
import {ICLPositionDescriptor} from "./interfaces/ICLPositionDescriptor.sol";
import {NativeWrapper} from "../base/NativeWrapper.sol";
import {IWETH9} from "../interfaces/external/IWETH9.sol";
import {LiquidityAmounts} from "../pool-cl/libraries/LiquidityAmounts.sol";
import {TickMath} from "infinity-core/pool-cl/libraries/TickMath.sol";

/// @title CLPositionManager
/// @notice Contract for modifying liquidity for PCS Infinity CL pools
contract CLPositionManager is
    ICLPositionManager,
    ERC721Permit,
    Multicall,
    DeltaResolver,
    ReentrancyLock,
    BaseActionsRouter,
    CLNotifier,
    Permit2Forwarder,
    NativeWrapper
{
    using CalldataDecoder for bytes;
    using CLCalldataDecoder for bytes;
    using CLPositionInfoLibrary for CLPositionInfo;
    using SafeCast for uint256;
    using SlippageCheck for BalanceDelta;

    ICLPoolManager public immutable override clPoolManager;

    /// @inheritdoc ICLPositionManager
    /// @dev The ID of the next token that will be minted. Skips 0
    uint256 public nextTokenId = 1;

    ICLPositionDescriptor public immutable tokenDescriptor;

    mapping(uint256 tokenId => CLPositionInfo info) public positionInfo;
    mapping(bytes25 poolId => PoolKey poolKey) public poolKeys;

    constructor(
        IVault _vault,
        ICLPoolManager _clPoolManager,
        IAllowanceTransfer _permit2,
        uint256 _unsubscribeGasLimit,
        ICLPositionDescriptor _tokenDescriptor,
        IWETH9 _weth9
    )
        BaseActionsRouter(_vault)
        Permit2Forwarder(_permit2)
        ERC721Permit("Pancakeswap Infinity Positions NFT", "PCS-INFINITY-POSM")
        CLNotifier(_unsubscribeGasLimit)
        NativeWrapper(_weth9)
    {
        clPoolManager = _clPoolManager;
        tokenDescriptor = _tokenDescriptor;
    }

    /// @dev <wip> might be refactored to BasePositionManager later
    /// @notice Reverts if the deadline has passed
    /// @param deadline The timestamp at which the call is no longer valid, passed in by the caller
    modifier checkDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert DeadlinePassed(deadline);
        _;
    }

    /// @notice Reverts if the caller is not the owner or approved for the ERC721 token
    /// @param caller The address of the caller
    /// @param tokenId the unique identifier of the ERC721 token
    /// @dev either msg.sender or msgSender() is passed in as the caller
    /// msgSender() should ONLY be used if this is being called from within the lockAcquired
    modifier onlyIfApproved(address caller, uint256 tokenId) override {
        if (!_isApprovedOrOwner(caller, tokenId)) revert NotApproved(caller);
        _;
    }

    /// @notice Enforces that the vault is unlocked.
    modifier onlyIfVaultUnlocked() override {
        if (vault.getLocker() != address(0)) revert VaultMustBeUnlocked();
        _;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return tokenDescriptor.tokenURI(this, tokenId);
    }

    /// @inheritdoc ICLPositionManager
    function initializePool(PoolKey calldata key, uint160 sqrtPriceX96) external payable override returns (int24) {
        /// @dev Swallow any error. If the pool revert due to other errors eg. currencyOutOfOrder etc..,
        /// then follow-up action to the pool will still revert accordingly
        try clPoolManager.initialize(key, sqrtPriceX96) returns (int24 tick) {
            return tick;
        } catch {
            return type(int24).max;
        }
    }

    /// @inheritdoc IPositionManager
    function modifyLiquidities(bytes calldata payload, uint256 deadline)
        external
        payable
        override
        isNotLocked
        checkDeadline(deadline)
    {
        _executeActions(payload);
    }

    /// @inheritdoc IPositionManager
    function modifyLiquiditiesWithoutLock(bytes calldata actions, bytes[] calldata params)
        external
        payable
        override
        isNotLocked
    {
        _executeActionsWithoutLock(actions, params);
    }

    /// @inheritdoc BaseActionsRouter
    function msgSender() public view override returns (address) {
        return _getLocker();
    }

    function _handleAction(uint256 action, bytes calldata params) internal virtual override {
        if (action < Actions.CL_SWAP_EXACT_IN_SINGLE) {
            if (action == Actions.CL_INCREASE_LIQUIDITY) {
                (uint256 tokenId, uint256 liquidity, uint128 amount0Max, uint128 amount1Max, bytes calldata hookData) =
                    params.decodeCLModifyLiquidityParams();
                _increase(tokenId, liquidity, amount0Max, amount1Max, hookData);
                return;
            } else if (action == Actions.CL_INCREASE_LIQUIDITY_FROM_DELTAS) {
                (uint256 tokenId, uint128 amount0Max, uint128 amount1Max, bytes calldata hookData) =
                    params.decodeCLIncreaseLiquidityFromDeltasParams();
                _increaseFromDeltas(tokenId, amount0Max, amount1Max, hookData);
                return;
            } else if (action == Actions.CL_DECREASE_LIQUIDITY) {
                (uint256 tokenId, uint256 liquidity, uint128 amount0Min, uint128 amount1Min, bytes calldata hookData) =
                    params.decodeCLModifyLiquidityParams();
                _decrease(tokenId, liquidity, amount0Min, amount1Min, hookData);
                return;
            } else if (action == Actions.CL_MINT_POSITION) {
                (
                    PoolKey calldata poolKey,
                    int24 tickLower,
                    int24 tickUpper,
                    uint256 liquidity,
                    uint128 amount0Max,
                    uint128 amount1Max,
                    address owner,
                    bytes calldata hookData
                ) = params.decodeCLMintParams();
                _mint(poolKey, tickLower, tickUpper, liquidity, amount0Max, amount1Max, _mapRecipient(owner), hookData);
                return;
            } else if (action == Actions.CL_MINT_POSITION_FROM_DELTAS) {
                (
                    PoolKey calldata poolKey,
                    int24 tickLower,
                    int24 tickUpper,
                    uint128 amount0Max,
                    uint128 amount1Max,
                    address owner,
                    bytes calldata hookData
                ) = params.decodeCLMintFromDeltasParams();
                _mintFromDeltas(poolKey, tickLower, tickUpper, amount0Max, amount1Max, _mapRecipient(owner), hookData);
                return;
            } else if (action == Actions.CL_BURN_POSITION) {
                // Will automatically decrease liquidity to 0 if the position is not already empty.
                (uint256 tokenId, uint128 amount0Min, uint128 amount1Min, bytes calldata hookData) =
                    params.decodeCLBurnParams();
                _burn(tokenId, amount0Min, amount1Min, hookData);
                return;
            }
        } else {
            if (action == Actions.SETTLE_PAIR) {
                (Currency currency0, Currency currency1) = params.decodeCurrencyPair();
                _settlePair(currency0, currency1);
                return;
            } else if (action == Actions.TAKE_PAIR) {
                (Currency currency0, Currency currency1, address recipient) = params.decodeCurrencyPairAndAddress();
                _takePair(currency0, currency1, _mapRecipient(recipient));
                return;
            } else if (action == Actions.SETTLE) {
                (Currency currency, uint256 amount, bool payerIsUser) = params.decodeCurrencyUint256AndBool();
                _settle(currency, _mapPayer(payerIsUser), _mapSettleAmount(amount, currency));
                return;
            } else if (action == Actions.TAKE) {
                (Currency currency, address recipient, uint256 amount) = params.decodeCurrencyAddressAndUint256();
                _take(currency, _mapRecipient(recipient), _mapTakeAmount(amount, currency));
                return;
            } else if (action == Actions.CLOSE_CURRENCY) {
                Currency currency = params.decodeCurrency();
                _close(currency);
                return;
            } else if (action == Actions.CLEAR_OR_TAKE) {
                (Currency currency, uint256 amountMax) = params.decodeCurrencyAndUint256();
                _clearOrTake(currency, amountMax);
                return;
            } else if (action == Actions.SWEEP) {
                (Currency currency, address to) = params.decodeCurrencyAndAddress();
                _sweep(currency, _mapRecipient(to));
                return;
            } else if (action == Actions.WRAP) {
                uint256 amount = params.decodeUint256();
                _wrap(_mapWrapUnwrapAmount(CurrencyLibrary.NATIVE, amount, Currency.wrap(address(WETH9))));
                return;
            } else if (action == Actions.UNWRAP) {
                uint256 amount = params.decodeUint256();
                _unwrap(_mapWrapUnwrapAmount(Currency.wrap(address(WETH9)), amount, CurrencyLibrary.NATIVE));
                return;
            }
        }
        revert UnsupportedAction(action);
    }

    /// @dev Calling increase with 0 liquidity will credit the caller with any underlying fees of the position
    function _increase(
        uint256 tokenId,
        uint256 liquidity,
        uint128 amount0Max,
        uint128 amount1Max,
        bytes calldata hookData
    ) internal onlyIfApproved(msgSender(), tokenId) {
        (PoolKey memory poolKey, CLPositionInfo info) = getPoolAndPositionInfo(tokenId);

        // Note: The tokenId is used as the salt for this position, so every minted position has unique storage in the pool manager.
        (BalanceDelta liquidityDelta, BalanceDelta feesAccrued) =
            _modifyLiquidity(info, poolKey, liquidity.toInt256(), bytes32(tokenId), hookData);
        // Slippage checks should be done on the principal liquidityDelta which is the liquidityDelta - feesAccrued
        (liquidityDelta - feesAccrued).validateMaxIn(amount0Max, amount1Max);
    }

    /// @dev The liquidity delta is derived from open deltas in the pool manager.
    function _increaseFromDeltas(uint256 tokenId, uint128 amount0Max, uint128 amount1Max, bytes calldata hookData)
        internal
        onlyIfApproved(msgSender(), tokenId)
    {
        (PoolKey memory poolKey, CLPositionInfo info) = getPoolAndPositionInfo(tokenId);

        (uint160 sqrtPriceX96,,,) = clPoolManager.getSlot0(poolKey.toId());

        // Use the credit on the pool manager as the amounts for the mint.
        uint256 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtRatioAtTick(info.tickLower()),
            TickMath.getSqrtRatioAtTick(info.tickUpper()),
            _getFullCredit(poolKey.currency0),
            _getFullCredit(poolKey.currency1)
        );

        // Note: The tokenId is used as the salt for this position, so every minted position has unique storage in the pool manager.
        (BalanceDelta liquidityDelta, BalanceDelta feesAccrued) =
            _modifyLiquidity(info, poolKey, liquidity.toInt256(), bytes32(tokenId), hookData);
        // Slippage checks should be done on the principal liquidityDelta which is the liquidityDelta - feesAccrued
        (liquidityDelta - feesAccrued).validateMaxIn(amount0Max, amount1Max);
    }

    /// @dev Calling decrease with 0 liquidity will credit the caller with any underlying fees of the position
    function _decrease(
        uint256 tokenId,
        uint256 liquidity,
        uint128 amount0Min,
        uint128 amount1Min,
        bytes calldata hookData
    ) internal onlyIfApproved(msgSender(), tokenId) {
        (PoolKey memory poolKey, CLPositionInfo info) = getPoolAndPositionInfo(tokenId);

        // Note: the tokenId is used as the salt.
        (BalanceDelta liquidityDelta, BalanceDelta feesAccrued) =
            _modifyLiquidity(info, poolKey, -(liquidity.toInt256()), bytes32(tokenId), hookData);

        // Slippage checks should be done on the principal liquidityDelta which is the liquidityDelta - feesAccrued
        (liquidityDelta - feesAccrued).validateMinOut(amount0Min, amount1Min);
    }

    function _mint(
        PoolKey calldata poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidity,
        uint128 amount0Max,
        uint128 amount1Max,
        address owner,
        bytes calldata hookData
    ) internal {
        // mint receipt token
        uint256 tokenId;
        // tokenId is assigned to current nextTokenId before incrementing it
        unchecked {
            tokenId = nextTokenId++;
        }
        _mint(owner, tokenId);

        // Initialize the position info
        CLPositionInfo info = CLPositionInfoLibrary.initialize(poolKey, tickLower, tickUpper);
        positionInfo[tokenId] = info;

        // Store the poolKey if it is not already stored.
        // if parameter (hook permission and tickSpacing) is bytes(0), it means the pool is not initialized yet
        bytes25 poolId = info.poolId();
        if (poolKeys[poolId].parameters == bytes32(0)) {
            poolKeys[poolId] = poolKey;
        }

        // fee delta can be ignored as this is a new position
        (BalanceDelta liquidityDelta,) =
            _modifyLiquidity(info, poolKey, liquidity.toInt256(), bytes32(tokenId), hookData);
        liquidityDelta.validateMaxIn(amount0Max, amount1Max);

        emit MintPosition(tokenId);
    }

    function _mintFromDeltas(
        PoolKey calldata poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount0Max,
        uint128 amount1Max,
        address owner,
        bytes calldata hookData
    ) internal {
        (uint160 sqrtPriceX96,,,) = clPoolManager.getSlot0(poolKey.toId());

        // Use the credit on the pool manager as the amounts for the mint.
        uint256 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            _getFullCredit(poolKey.currency0),
            _getFullCredit(poolKey.currency1)
        );

        _mint(poolKey, tickLower, tickUpper, liquidity, amount0Max, amount1Max, owner, hookData);
    }

    /// @dev this is overloaded with ERC721Permit._burn
    function _burn(uint256 tokenId, uint128 amount0Min, uint128 amount1Min, bytes calldata hookData)
        internal
        onlyIfApproved(msgSender(), tokenId)
    {
        (PoolKey memory poolKey, CLPositionInfo info) = getPoolAndPositionInfo(tokenId);

        uint256 liquidity = uint256(_getLiquidity(tokenId, poolKey, info.tickLower(), info.tickUpper()));

        address owner = ownerOf(tokenId);

        // Clear the position info.
        positionInfo[tokenId] = CLPositionInfoLibrary.EMPTY_POSITION_INFO;
        // Burn the token.
        _burn(tokenId);

        // Can only call modify if there is non zero liquidity.
        BalanceDelta feesAccrued;
        if (liquidity > 0) {
            BalanceDelta liquidityDelta;
            (liquidityDelta, feesAccrued) = clPoolManager.modifyLiquidity(
                poolKey,
                ICLPoolManager.ModifyLiquidityParams({
                    tickLower: info.tickLower(),
                    tickUpper: info.tickUpper(),
                    liquidityDelta: -(liquidity.toInt256()),
                    salt: bytes32(tokenId)
                }),
                hookData
            );
            // Slippage checks should be done on the principal liquidityDelta which is the liquidityDelta - feesAccrued
            (liquidityDelta - feesAccrued).validateMinOut(amount0Min, amount1Min);

            emit ModifyLiquidity(tokenId, -(liquidity.toInt256()), feesAccrued);
        }

        if (info.hasSubscriber()) _removeSubscriberAndNotifyBurn(tokenId, owner, info, liquidity, feesAccrued);
    }

    function _settlePair(Currency currency0, Currency currency1) internal {
        // the locker is the payer when settling
        address caller = msgSender();
        _settle(currency0, caller, _getFullDebt(currency0));
        _settle(currency1, caller, _getFullDebt(currency1));
    }

    function _takePair(Currency currency0, Currency currency1, address recipient) internal {
        _take(currency0, recipient, _getFullCredit(currency0));
        _take(currency1, recipient, _getFullCredit(currency1));
    }

    function _close(Currency currency) internal {
        // this address has applied all deltas on behalf of the user/owner
        // it is safe to close this entire delta because of slippage checks throughout the batched calls.
        int256 currencyDelta = vault.currencyDelta(address(this), currency);

        // the locker is the payer or receiver
        address caller = msgSender();
        if (currencyDelta < 0) {
            _settle(currency, caller, uint256(-currencyDelta));
        } else {
            _take(currency, caller, uint256(currencyDelta));
        }
    }

    /// @dev integrators may elect to forfeit positive deltas with clear
    /// if the forfeit amount exceeds the user-specified max, the amount is taken instead
    function _clearOrTake(Currency currency, uint256 amountMax) internal {
        uint256 delta = _getFullCredit(currency);

        // forfeit the delta if its less than or equal to the user-specified limit
        if (delta <= amountMax) {
            vault.clear(currency, delta);
        } else {
            _take(currency, msgSender(), delta);
        }
    }

    /// @notice Sweeps the entire contract balance of specified currency to the recipient
    function _sweep(Currency currency, address to) internal {
        uint256 balance = currency.balanceOfSelf();
        if (balance > 0) currency.transfer(to, balance);
    }

    /// @dev if there is a subscriber attached to the position, this function will notify the subscriber
    function _modifyLiquidity(
        CLPositionInfo info,
        PoolKey memory poolKey,
        int256 liquidityChange,
        bytes32 salt,
        bytes calldata hookData
    ) internal returns (BalanceDelta liquidityDelta, BalanceDelta feesAccrued) {
        (liquidityDelta, feesAccrued) = clPoolManager.modifyLiquidity(
            poolKey,
            ICLPoolManager.ModifyLiquidityParams({
                tickLower: info.tickLower(),
                tickUpper: info.tickUpper(),
                liquidityDelta: liquidityChange,
                salt: salt
            }),
            hookData
        );

        uint256 tokenId = uint256(salt);
        emit ModifyLiquidity(tokenId, liquidityChange, feesAccrued);

        if (info.hasSubscriber()) {
            _notifyModifyLiquidity(tokenId, liquidityChange, feesAccrued);
        }
    }

    function _pay(Currency currency, address payer, uint256 amount) internal override(DeltaResolver) {
        if (payer == address(this)) {
            currency.transfer(address(vault), amount);
        } else {
            permit2.transferFrom(payer, address(vault), uint160(amount), Currency.unwrap(currency));
        }
    }

    /// @notice an internal helper used by CLNotifier
    function _setSubscribed(uint256 tokenId) internal override {
        positionInfo[tokenId] = positionInfo[tokenId].setSubscribe();
    }

    /// @notice an internal helper used by CLNotifier
    function _setUnsubscribed(uint256 tokenId) internal override {
        positionInfo[tokenId] = positionInfo[tokenId].setUnsubscribe();
    }

    /// @dev overrides solmate transferFrom in case a notification to subscribers is needed
    /// @dev will revert if vault is locked
    function transferFrom(address from, address to, uint256 id) public virtual override onlyIfVaultUnlocked {
        super.transferFrom(from, to, id);
        if (positionInfo[id].hasSubscriber()) _unsubscribe(id);
    }

    /// @inheritdoc ICLPositionManager
    function getPoolAndPositionInfo(uint256 tokenId)
        public
        view
        returns (PoolKey memory poolKey, CLPositionInfo info)
    {
        info = positionInfo[tokenId];
        poolKey = poolKeys[info.poolId()];
    }

    /// @inheritdoc ICLPositionManager
    function getPositionLiquidity(uint256 tokenId) external view returns (uint128 liquidity) {
        (PoolKey memory poolKey, CLPositionInfo info) = getPoolAndPositionInfo(tokenId);
        return _getLiquidity(tokenId, poolKey, info.tickLower(), info.tickUpper());
    }

    /// @inheritdoc ICLPositionManager
    function positions(uint256 tokenId)
        external
        view
        returns (
            PoolKey memory poolKey,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            ICLSubscriber _subscriber
        )
    {
        CLPositionInfo info;
        (poolKey, info) = getPoolAndPositionInfo(tokenId);
        PoolId poolId = poolKey.toId();
        if (CLPositionInfo.unwrap(info) == 0) revert InvalidTokenID();
        tickLower = info.tickLower();
        tickUpper = info.tickUpper();

        CLPosition.Info memory position =
            clPoolManager.getPosition(poolId, address(this), tickLower, tickUpper, bytes32(tokenId));

        liquidity = position.liquidity;
        feeGrowthInside0LastX128 = position.feeGrowthInside0LastX128;
        feeGrowthInside1LastX128 = position.feeGrowthInside1LastX128;
        _subscriber = subscriber[tokenId];
    }

    function _getLiquidity(uint256 tokenId, PoolKey memory poolKey, int24 tickLower, int24 tickUpper)
        internal
        view
        returns (uint128 liquidity)
    {
        CLPosition.Info memory position =
            clPoolManager.getPosition(poolKey.toId(), address(this), tickLower, tickUpper, bytes32(tokenId));

        liquidity = position.liquidity;
    }
}
```

---

## 5. CLQuoter

**Address:** `0x8197a04498bee6212aF4Ef5A647f35FF8Ff6841b`  
**Deployed:** November 19, 2025  
**File:** `src/infinity-periphery/pool-cl/lens/CLQuoter.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity 0.8.20;

import {TickMath} from "infinity-core/pool-cl/libraries/TickMath.sol";
import {ICLPoolManager} from "infinity-core/pool-cl/interfaces/ICLPoolManager.sol";
import {BalanceDelta} from "infinity-core/types/BalanceDelta.sol";
import {PoolKey} from "infinity-core/types/PoolKey.sol";
import {PoolId} from "infinity-core/types/PoolId.sol";
import {ICLQuoter} from "../interfaces/ICLQuoter.sol";
import {PoolTicksCounter} from "../libraries/PoolTicksCounter.sol";
import {PathKey, PathKeyLibrary} from "../../libraries/PathKey.sol";
import {BaseInfinityQuoter} from "../../base/BaseInfinityQuoter.sol";
import {QuoterRevert} from "../../libraries/QuoterRevert.sol";
import {Currency} from "infinity-core/types/Currency.sol";

contract CLQuoter is ICLQuoter, BaseInfinityQuoter {
    using QuoterRevert for *;

    ICLPoolManager public immutable poolManager;

    constructor(address _poolManager) BaseInfinityQuoter(_poolManager) {
        poolManager = ICLPoolManager(_poolManager);
    }

    /// @inheritdoc ICLQuoter
    function quoteExactInputSingle(QuoteExactSingleParams memory params)
        external
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactInputSingle, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountOut = reason.parseQuoteAmount();
        }
    }

    /// @inheritdoc ICLQuoter
    function quoteExactInputSingleList(QuoteExactSingleParams[] memory params)
        external
        returns (uint256 amountIn, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactInputSingleList, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountIn = reason.parseQuoteAmount();
        }
    }

    /// @inheritdoc ICLQuoter
    function quoteExactInput(QuoteExactParams memory params)
        external
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactInput, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountOut = reason.parseQuoteAmount();
        }
    }

    /// @inheritdoc ICLQuoter
    function quoteExactOutputSingle(QuoteExactSingleParams memory params)
        external
        returns (uint256 amountIn, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactOutputSingle, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountIn = reason.parseQuoteAmount();
        }
    }

    /// @inheritdoc ICLQuoter
    function quoteExactOutput(QuoteExactParams memory params)
        external
        returns (uint256 amountIn, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactOutput, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountIn = reason.parseQuoteAmount();
        }
    }

    /// @dev quote an ExactInput swap along a path of tokens, then revert with the result
    function _quoteExactInput(QuoteExactParams calldata params) external selfOnly returns (bytes memory) {
        uint256 pathLength = params.path.length;
        BalanceDelta swapDelta;
        uint128 amountIn = params.exactAmount;
        Currency inputCurrency = params.exactCurrency;
        PathKey calldata pathKey;

        for (uint256 i = 0; i < pathLength; i++) {
            pathKey = params.path[i];
            (PoolKey memory poolKey, bool zeroForOne) = pathKey.getPoolAndSwapDirection(inputCurrency);

            swapDelta = _swap(poolKey, zeroForOne, -int256(int128(amountIn)), pathKey.hookData);

            amountIn = zeroForOne ? uint128(swapDelta.amount1()) : uint128(swapDelta.amount0());
            inputCurrency = pathKey.intermediateCurrency;
        }
        // amountIn after the loop actually holds the amountOut of the trade
        amountIn.revertQuote();
    }

    /// @dev quote an ExactInput swap on a pool, then revert with the result
    function _quoteExactInputSingle(QuoteExactSingleParams calldata params) external selfOnly returns (bytes memory) {
        BalanceDelta swapDelta =
            _swap(params.poolKey, params.zeroForOne, -int256(int128(params.exactAmount)), params.hookData);

        // the output delta of a swap is positive
        uint256 amountOut = params.zeroForOne ? uint128(swapDelta.amount1()) : uint128(swapDelta.amount0());
        amountOut.revertQuote();
    }

    /// @dev quote ExactInput swap list on a pool, then revert with the result of last swap
    function _quoteExactInputSingleList(QuoteExactSingleParams[] calldata swapParamList)
        external
        selfOnly
        returns (bytes memory)
    {
        uint256 swapLength = swapParamList.length;
        if (swapLength == 0) revert();
        uint256 amountOut;
        for (uint256 i = 0; i < swapLength; i++) {
            QuoteExactSingleParams memory params = swapParamList[i];
            BalanceDelta swapDelta =
                _swap(params.poolKey, params.zeroForOne, -int256(int128(params.exactAmount)), params.hookData);
            if (i == swapLength - 1) {
                // the output delta of a swap is positive
                amountOut = params.zeroForOne ? uint128(swapDelta.amount1()) : uint128(swapDelta.amount0());
            }
        }
        amountOut.revertQuote();
    }

    /// @dev quote an ExactOutput swap along a path of tokens, then revert with the result
    function _quoteExactOutput(QuoteExactParams calldata params) external selfOnly returns (bytes memory) {
        uint256 pathLength = params.path.length;
        BalanceDelta swapDelta;
        uint128 amountOut = params.exactAmount;
        Currency outputCurrency = params.exactCurrency;
        PathKey calldata pathKey;

        for (uint256 i = pathLength; i > 0; i--) {
            pathKey = params.path[i - 1];
            (PoolKey memory poolKey, bool oneForZero) = pathKey.getPoolAndSwapDirection(outputCurrency);

            swapDelta = _swap(poolKey, !oneForZero, int256(uint256(amountOut)), pathKey.hookData);

            amountOut = oneForZero ? uint128(-swapDelta.amount1()) : uint128(-swapDelta.amount0());
            outputCurrency = pathKey.intermediateCurrency;
        }
        // amountOut after the loop exits actually holds the amountIn of the trade
        amountOut.revertQuote();
    }

    /// @dev quote an ExactOutput swap on a pool, then revert with the result
    function _quoteExactOutputSingle(QuoteExactSingleParams calldata params) external selfOnly returns (bytes memory) {
        BalanceDelta swapDelta =
            _swap(params.poolKey, params.zeroForOne, int256(uint256(params.exactAmount)), params.hookData);

        // the input delta of a swap is negative so we must flip it
        uint256 amountIn = params.zeroForOne ? uint128(-swapDelta.amount0()) : uint128(-swapDelta.amount1());
        amountIn.revertQuote();
    }

    /// @dev Execute a swap and return the balance delta
    /// @notice if amountSpecified < 0, the swap is exactInput, otherwise exactOutput
    function _swap(PoolKey memory poolKey, bool zeroForOne, int256 amountSpecified, bytes memory hookData)
        private
        returns (BalanceDelta deltas)
    {
        deltas = poolManager.swap(
            poolKey,
            ICLPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: amountSpecified,
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1
            }),
            hookData
        );
        // Check that the pool was not illiquid.
        int128 amountSpecifiedActual = (zeroForOne == (amountSpecified < 0)) ? deltas.amount0() : deltas.amount1();
        if (amountSpecifiedActual != amountSpecified) {
            revert NotEnoughLiquidity(poolKey.toId());
        }
    }
}
```

---

## 6. CLPositionDescriptor

**Address:** `0xd5Ee30B2344fAb565606b75BCAca43480719fee4`  
**Deployed:** November 19, 2025  
**File:** `src/infinity-periphery/pool-cl/CLPositionDescriptorOffChain.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity ^0.8.20;

import {ICLPositionDescriptor} from "./interfaces/ICLPositionDescriptor.sol";
import {ICLPositionManager} from "./interfaces/ICLPositionManager.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Describes NFT token positions
contract CLPositionDescriptorOffChain is ICLPositionDescriptor, Ownable {
    using Strings for uint256;

    string private _baseTokenURI;

    /// @notice Just in case we want to upgrade the tokenURI generation logic
    /// This defaults to address(0) but will be used if set
    ICLPositionDescriptor public tokenURIContract;

    constructor(string memory baseTokenURI) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }

    function setBaseTokenURI(string memory baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
    }

    function setTokenURIContract(ICLPositionDescriptor newTokenURIContract) external onlyOwner {
        tokenURIContract = newTokenURIContract;
    }

    /// @inheritdoc ICLPositionDescriptor
    function tokenURI(ICLPositionManager positionManager, uint256 tokenId)
        external
        view
        override
        returns (string memory)
    {
        // if set, this will be used instead of _baseTokenURI
        if (address(tokenURIContract) != address(0)) {
            return tokenURIContract.tokenURI(positionManager, tokenId);
        }

        return bytes(_baseTokenURI).length > 0 ? string(abi.encodePacked(_baseTokenURI, tokenId.toString())) : "";
    }
}
```

---

## 7. BinPositionManager

**Address:** `0x57D13FA23A308ADd3Bb78A0ff7e7663Ef9867b96`  
**Deployed:** November 19, 2025  
**File:** `src/infinity-periphery/pool-bin/BinPositionManager.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity 0.8.20;

import {IVault} from "infinity-core/interfaces/IVault.sol";
import {BalanceDelta} from "infinity-core/types/BalanceDelta.sol";
import {Currency, CurrencyLibrary} from "infinity-core/types/Currency.sol";
import {IBinPoolManager} from "infinity-core/pool-bin/interfaces/IBinPoolManager.sol";
import {BinPool} from "infinity-core/pool-bin/libraries/BinPool.sol";
import {PoolKey} from "infinity-core/types/PoolKey.sol";
import {PoolId} from "infinity-core/types/PoolId.sol";
import {LiquidityConfigurations} from "infinity-core/pool-bin/libraries/math/LiquidityConfigurations.sol";
import {BinPoolParametersHelper} from "infinity-core/pool-bin/libraries/BinPoolParametersHelper.sol";
import {PackedUint128Math} from "infinity-core/pool-bin/libraries/math/PackedUint128Math.sol";

import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

import {SafeCastTemp} from "../libraries/SafeCast.sol";
import {BaseActionsRouter} from "../base/BaseActionsRouter.sol";
import {ReentrancyLock} from "../base/ReentrancyLock.sol";
import {DeltaResolver} from "../base/DeltaResolver.sol";
import {Permit2Forwarder} from "../base/Permit2Forwarder.sol";
import {IPositionManager} from "../interfaces/IPositionManager.sol";
import {IBinPositionManager} from "./interfaces/IBinPositionManager.sol";
import {CalldataDecoder} from "../libraries/CalldataDecoder.sol";
import {Actions} from "../libraries/Actions.sol";
import {BinCalldataDecoder} from "./libraries/BinCalldataDecoder.sol";
import {BinFungibleToken} from "./BinFungibleToken.sol";
import {BinTokenLibrary} from "./libraries/BinTokenLibrary.sol";
import {Multicall} from "../base/Multicall.sol";
import {SlippageCheck} from "../libraries/SlippageCheck.sol";
import {NativeWrapper} from "../base/NativeWrapper.sol";
import {IWETH9} from "../interfaces/external/IWETH9.sol";

/// @title BinPositionManager
/// @notice Contract for modifying liquidity for PCS infinity Bin pools
contract BinPositionManager is
    IBinPositionManager,
    BinFungibleToken,
    DeltaResolver,
    ReentrancyLock,
    BaseActionsRouter,
    Permit2Forwarder,
    Multicall,
    NativeWrapper
{
    using CalldataDecoder for bytes;
    using PackedUint128Math for uint128;
    using BinCalldataDecoder for bytes;
    using BinTokenLibrary for PoolId;
    using BinPoolParametersHelper for bytes32;
    using SlippageCheck for BalanceDelta;
    using SafeCastTemp for uint256;

    IBinPoolManager public immutable override binPoolManager;

    struct TokenPosition {
        PoolId poolId;
        uint24 binId;
    }

    /// @dev tokenId => TokenPosition
    mapping(uint256 => TokenPosition) private _positions;

    /// @dev poolId => poolKey
    mapping(bytes32 => PoolKey) private _poolIdToPoolKey;

    constructor(IVault _vault, IBinPoolManager _binPoolManager, IAllowanceTransfer _permit2, IWETH9 _weth9)
        BaseActionsRouter(_vault)
        Permit2Forwarder(_permit2)
        NativeWrapper(_weth9)
    {
        binPoolManager = _binPoolManager;
    }

    /// @notice Reverts if the deadline has passed
    /// @param deadline The timestamp at which the call is no longer valid, passed in by the caller
    modifier checkDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert DeadlinePassed(deadline);
        _;
    }

    /// @notice Enforces that the vault is unlocked.
    modifier onlyIfVaultUnlocked() override {
        if (vault.getLocker() != address(0)) revert VaultMustBeUnlocked();
        _;
    }

    /// @inheritdoc IBinPositionManager
    function positions(uint256 tokenId) external view returns (PoolKey memory, uint24) {
        TokenPosition memory position = _positions[tokenId];

        if (PoolId.unwrap(position.poolId) == 0) revert InvalidTokenID();
        PoolKey memory poolKey = _poolIdToPoolKey[PoolId.unwrap(position.poolId)];

        return (poolKey, position.binId);
    }

    /// @inheritdoc IPositionManager
    function modifyLiquidities(bytes calldata payload, uint256 deadline)
        external
        payable
        override
        isNotLocked
        checkDeadline(deadline)
    {
        _executeActions(payload);
    }

    /// @inheritdoc IPositionManager
    function modifyLiquiditiesWithoutLock(bytes calldata actions, bytes[] calldata params)
        external
        payable
        override
        isNotLocked
    {
        _executeActionsWithoutLock(actions, params);
    }

    /// @inheritdoc IBinPositionManager
    function initializePool(PoolKey memory key, uint24 activeId) external payable {
        /// @dev if the pool revert due to other error (currencyOutOfOrder etc..), then the follow-up action to the pool will still revert accordingly
        try binPoolManager.initialize(key, activeId) {} catch {}
    }

    function msgSender() public view override returns (address) {
        return _getLocker();
    }

    function _handleAction(uint256 action, bytes calldata params) internal virtual override {
        if (action > Actions.BURN_6909) {
            if (action == Actions.BIN_ADD_LIQUIDITY) {
                IBinPositionManager.BinAddLiquidityParams calldata liquidityParams =
                    params.decodeBinAddLiquidityParams();
                _addLiquidity(
                    liquidityParams.poolKey,
                    liquidityParams.amount0,
                    liquidityParams.amount1,
                    liquidityParams.amount0Max,
                    liquidityParams.amount1Max,
                    liquidityParams.activeIdDesired,
                    liquidityParams.idSlippage,
                    liquidityParams.deltaIds,
                    liquidityParams.distributionX,
                    liquidityParams.distributionY,
                    liquidityParams.to,
                    liquidityParams.hookData
                );
                return;
            } else if (action == Actions.BIN_ADD_LIQUIDITY_FROM_DELTAS) {
                IBinPositionManager.BinAddLiquidityFromDeltasParams calldata liquidityParams =
                    params.decodeBinAddLiquidityFromDeltasParams();
                _addLiquidity(
                    liquidityParams.poolKey,
                    _getFullCredit(liquidityParams.poolKey.currency0).toUint128(),
                    _getFullCredit(liquidityParams.poolKey.currency1).toUint128(),
                    liquidityParams.amount0Max,
                    liquidityParams.amount1Max,
                    liquidityParams.activeIdDesired,
                    liquidityParams.idSlippage,
                    liquidityParams.deltaIds,
                    liquidityParams.distributionX,
                    liquidityParams.distributionY,
                    liquidityParams.to,
                    liquidityParams.hookData
                );
                return;
            } else if (action == Actions.BIN_REMOVE_LIQUIDITY) {
                IBinPositionManager.BinRemoveLiquidityParams calldata liquidityParams =
                    params.decodeBinRemoveLiquidityParams();
                _removeLiquidity(liquidityParams);
                return;
            }
        } else {
            if (action == Actions.SETTLE_PAIR) {
                (Currency currency0, Currency currency1) = params.decodeCurrencyPair();
                _settlePair(currency0, currency1);
                return;
            } else if (action == Actions.TAKE_PAIR) {
                (Currency currency0, Currency currency1, address recipient) = params.decodeCurrencyPairAndAddress();
                _takePair(currency0, currency1, _mapRecipient(recipient));
                return;
            } else if (action == Actions.SETTLE) {
                (Currency currency, uint256 amount, bool payerIsUser) = params.decodeCurrencyUint256AndBool();
                _settle(currency, _mapPayer(payerIsUser), _mapSettleAmount(amount, currency));
                return;
            } else if (action == Actions.TAKE) {
                (Currency currency, address recipient, uint256 amount) = params.decodeCurrencyAddressAndUint256();
                _take(currency, _mapRecipient(recipient), _mapTakeAmount(amount, currency));
                return;
            } else if (action == Actions.CLOSE_CURRENCY) {
                Currency currency = params.decodeCurrency();
                _close(currency);
                return;
            } else if (action == Actions.CLEAR_OR_TAKE) {
                (Currency currency, uint256 amountMax) = params.decodeCurrencyAndUint256();
                _clearOrTake(currency, amountMax);
                return;
            } else if (action == Actions.SWEEP) {
                (Currency currency, address to) = params.decodeCurrencyAndAddress();
                _sweep(currency, _mapRecipient(to));
                return;
            } else if (action == Actions.WRAP) {
                uint256 amount = params.decodeUint256();
                _wrap(_mapWrapUnwrapAmount(CurrencyLibrary.NATIVE, amount, Currency.wrap(address(WETH9))));
                return;
            } else if (action == Actions.UNWRAP) {
                uint256 amount = params.decodeUint256();
                _unwrap(_mapWrapUnwrapAmount(Currency.wrap(address(WETH9)), amount, CurrencyLibrary.NATIVE));
                return;
            }
        }
        revert UnsupportedAction(action);
    }

    /// @dev Store poolKey in mapping for lookup
    function cachePoolKey(PoolKey memory poolKey) internal returns (PoolId poolId) {
        poolId = poolKey.toId();

        if (_poolIdToPoolKey[PoolId.unwrap(poolId)].parameters.getBinStep() == 0) {
            _poolIdToPoolKey[PoolId.unwrap(poolId)] = poolKey;
        }
    }

    function _addLiquidity(
        PoolKey calldata poolKey,
        uint128 amount0,
        uint128 amount1,
        uint128 amount0Max,
        uint128 amount1Max,
        uint256 activeIdDesired,
        uint256 idSlippage,
        int256[] calldata deltaIds,
        uint256[] calldata distributionX,
        uint256[] calldata distributionY,
        address to,
        bytes calldata hookData
    ) internal {
        uint256 deltaLen = deltaIds.length;
        uint256 lenX = distributionX.length;
        uint256 lenY = distributionY.length;
        assembly ("memory-safe") {
            /// @dev revert if deltaLen != lenX || deltaLen != lenY
            if iszero(and(eq(deltaLen, lenX), eq(deltaLen, lenY))) {
                mstore(0, 0xaaad13f7) // selector InputLengthMismatch
                revert(0x1c, 0x04)
            }
        }

        if (activeIdDesired > type(uint24).max || idSlippage > type(uint24).max) {
            revert AddLiquidityInputActiveIdMismatch();
        }

        /// @dev Checks if the activeId is within slippage before calling mint. If user mint to activeId and there
        //       was a swap in hook.beforeMint() which changes the activeId, user txn will fail
        (uint24 activeId,,) = binPoolManager.getSlot0(poolKey.toId());
        if (activeIdDesired + idSlippage < activeId) {
            revert IdSlippageCaught(activeIdDesired, idSlippage, activeId);
        }
        if (activeIdDesired - idSlippage > activeId) {
            revert IdSlippageCaught(activeIdDesired, idSlippage, activeId);
        }

        bytes32[] memory liquidityConfigs = new bytes32[](deltaLen);
        for (uint256 i; i < liquidityConfigs.length; i++) {
            int256 _id = int256(uint256(activeId)) + deltaIds[i];
            if (_id < 0 || uint256(_id) > type(uint24).max) revert IdOverflows(_id);

            liquidityConfigs[i] = LiquidityConfigurations.encodeParams(
                uint64(distributionX[i]), uint64(distributionY[i]), uint24(uint256(_id))
            );
        }

        bytes32 amountIn = amount0.encode(amount1);
        (BalanceDelta delta, BinPool.MintArrays memory mintArray) = binPoolManager.mint(
            poolKey,
            IBinPoolManager.MintParams({liquidityConfigs: liquidityConfigs, amountIn: amountIn, salt: bytes32(0)}),
            hookData
        );

        /// Slippage checks, similar to CL type. However, this is different from TJ. In PCS infinity,
        /// as hooks can impact delta (take extra token), user need to be protected with amountMax instead
        delta.validateMaxIn(amount0Max, amount1Max);

        // mint
        PoolId poolId = cachePoolKey(poolKey);
        uint256[] memory tokenIds = new uint256[](mintArray.ids.length);
        for (uint256 i; i < mintArray.ids.length; i++) {
            uint256 tokenId = poolId.toTokenId(mintArray.ids[i]);
            _mint(to, tokenId, mintArray.liquidityMinted[i]);

            if (_positions[tokenId].binId == 0) {
                _positions[tokenId] = TokenPosition({poolId: poolId, binId: uint24(mintArray.ids[i])});
            }

            tokenIds[i] = tokenId;
        }

        emit TransferBatch(msgSender(), address(0), to, tokenIds, mintArray.liquidityMinted);
    }

    function _removeLiquidity(IBinPositionManager.BinRemoveLiquidityParams calldata params)
        internal
        checkApproval(params.from, msgSender())
    {
        if (params.ids.length != params.amounts.length) revert InputLengthMismatch();

        BalanceDelta delta = binPoolManager.burn(
            params.poolKey,
            IBinPoolManager.BurnParams({ids: params.ids, amountsToBurn: params.amounts, salt: bytes32(0)}),
            params.hookData
        );

        // Slippage checks, similar to CL type, if delta is negative, it will revert.
        delta.validateMinOut(params.amount0Min, params.amount1Min);

        PoolId poolId = params.poolKey.toId();
        uint256[] memory tokenIds = new uint256[](params.ids.length);
        for (uint256 i; i < params.ids.length; i++) {
            uint256 tokenId = poolId.toTokenId(params.ids[i]);
            _burn(params.from, tokenId, params.amounts[i]);

            tokenIds[i] = tokenId;
        }

        emit TransferBatch(msgSender(), params.from, address(0), tokenIds, params.amounts);
    }

    function _settlePair(Currency currency0, Currency currency1) internal {
        // the locker is the payer when settling
        address caller = msgSender();
        _settle(currency0, caller, _getFullDebt(currency0));
        _settle(currency1, caller, _getFullDebt(currency1));
    }

    function _takePair(Currency currency0, Currency currency1, address recipient) internal {
        _take(currency0, recipient, _getFullCredit(currency0));
        _take(currency1, recipient, _getFullCredit(currency1));
    }

    function _close(Currency currency) internal {
        // this address has applied all deltas on behalf of the user/owner
        // it is safe to close this entire delta because of slippage checks throughout the batched calls.
        int256 currencyDelta = vault.currencyDelta(address(this), currency);

        // the locker is the payer or receiver
        address caller = msgSender();
        if (currencyDelta < 0) {
            _settle(currency, caller, uint256(-currencyDelta));
        } else {
            _take(currency, caller, uint256(currencyDelta));
        }
    }

    /// @dev integrators may elect to forfeit positive deltas with clear
    /// if the forfeit amount exceeds the user-specified max, the amount is taken instead
    function _clearOrTake(Currency currency, uint256 amountMax) internal {
        uint256 delta = _getFullCredit(currency);

        // forfeit the delta if its less than or equal to the user-specified limit
        if (delta <= amountMax) {
            vault.clear(currency, delta);
        } else {
            _take(currency, msgSender(), delta);
        }
    }

    /// @notice Sweeps the entire contract balance of specified currency to the recipient
    function _sweep(Currency currency, address to) internal {
        uint256 balance = currency.balanceOfSelf();
        if (balance > 0) currency.transfer(to, balance);
    }

    function _pay(Currency currency, address payer, uint256 amount) internal override(DeltaResolver) {
        if (payer == address(this)) {
            currency.transfer(address(vault), amount);
        } else {
            permit2.transferFrom(payer, address(vault), uint160(amount), Currency.unwrap(currency));
        }
    }
}
```

---

## 8. BinQuoter

**Address:** `0x7a9758edFf23C3523c344c7FCAb48e700868331C`  
**Deployed:** November 19, 2025  
**File:** `src/infinity-periphery/pool-bin/lens/BinQuoter.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity 0.8.20;

import {TickMath} from "infinity-core/pool-cl/libraries/TickMath.sol";
import {IVault} from "infinity-core/interfaces/IVault.sol";
import {IBinPoolManager} from "infinity-core/pool-bin/interfaces/IBinPoolManager.sol";
import {BalanceDelta} from "infinity-core/types/BalanceDelta.sol";
import {Currency} from "infinity-core/types/Currency.sol";
import {PoolKey} from "infinity-core/types/PoolKey.sol";
import {SafeCast} from "infinity-core/pool-bin/libraries/math/SafeCast.sol";
import {PoolId} from "infinity-core/types/PoolId.sol";
import {IBinQuoter} from "../interfaces/IBinQuoter.sol";
import {PathKey, PathKeyLibrary} from "../../libraries/PathKey.sol";
import {BaseInfinityQuoter} from "../../base/BaseInfinityQuoter.sol";
import {QuoterRevert} from "../../libraries/QuoterRevert.sol";

contract BinQuoter is BaseInfinityQuoter, IBinQuoter {
    using QuoterRevert for *;
    using SafeCast for uint128;

    IBinPoolManager public immutable poolManager;

    constructor(address _poolManager) BaseInfinityQuoter(_poolManager) {
        poolManager = IBinPoolManager(_poolManager);
    }

    /// @inheritdoc IBinQuoter
    function quoteExactInputSingle(QuoteExactSingleParams memory params)
        external
        override
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactInputSingle, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountOut = reason.parseQuoteAmount();
        }
    }

    /// @inheritdoc IBinQuoter
    function quoteExactInputSingleList(QuoteExactSingleParams[] memory params)
        external
        returns (uint256 amountIn, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactInputSingleList, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountIn = reason.parseQuoteAmount();
        }
    }

    /// @inheritdoc IBinQuoter
    function quoteExactInput(QuoteExactParams memory params)
        external
        override
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactInput, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountOut = reason.parseQuoteAmount();
        }
    }

    /// @inheritdoc IBinQuoter
    function quoteExactOutputSingle(QuoteExactSingleParams memory params)
        external
        override
        returns (uint256 amountIn, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactOutputSingle, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountIn = reason.parseQuoteAmount();
        }
    }

    /// @inheritdoc IBinQuoter
    function quoteExactOutput(QuoteExactParams memory params)
        external
        override
        returns (uint256 amountIn, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        try vault.lock(abi.encodeCall(this._quoteExactOutput, (params))) {}
        catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            // Extract the quote from QuoteSwap error, or throw if the quote failed
            amountIn = reason.parseQuoteAmount();
        }
    }

    /// @dev quote an ExactInput swap along a path of tokens, then revert with the result
    function _quoteExactInput(QuoteExactParams calldata params) external selfOnly returns (bytes memory) {
        uint256 pathLength = params.path.length;
        BalanceDelta swapDelta;
        uint128 amountIn = params.exactAmount;
        Currency inputCurrency = params.exactCurrency;
        PathKey calldata pathKey;

        for (uint256 i = 0; i < pathLength; i++) {
            pathKey = params.path[i];
            (PoolKey memory poolKey, bool zeroForOne) = pathKey.getPoolAndSwapDirection(inputCurrency);

            swapDelta = _swap(poolKey, zeroForOne, -amountIn.safeInt128(), pathKey.hookData);

            amountIn = zeroForOne ? uint128(swapDelta.amount1()) : uint128(swapDelta.amount0());
            inputCurrency = pathKey.intermediateCurrency;
        }
        // amountIn after the loop actually holds the amountOut of the trade
        amountIn.revertQuote();
    }

    /// @dev quote an ExactInput swap on a pool, then revert with the result
    function _quoteExactInputSingle(QuoteExactSingleParams calldata params) external selfOnly returns (bytes memory) {
        BalanceDelta swapDelta =
            _swap(params.poolKey, params.zeroForOne, -(params.exactAmount.safeInt128()), params.hookData);

        // the output delta of a swap is positive
        uint256 amountOut = params.zeroForOne ? uint128(swapDelta.amount1()) : uint128(swapDelta.amount0());
        amountOut.revertQuote();
    }

    /// @dev quote ExactInput swap list on a pool, then revert with the result of last swap
    function _quoteExactInputSingleList(QuoteExactSingleParams[] calldata swapParamList)
        external
        selfOnly
        returns (bytes memory)
    {
        uint256 swapLength = swapParamList.length;
        if (swapLength == 0) revert();
        uint256 amountOut;
        for (uint256 i = 0; i < swapLength; i++) {
            QuoteExactSingleParams memory params = swapParamList[i];
            BalanceDelta swapDelta =
                _swap(params.poolKey, params.zeroForOne, -(params.exactAmount.safeInt128()), params.hookData);
            if (i == swapLength - 1) {
                // the output delta of a swap is positive
                amountOut = params.zeroForOne ? uint128(swapDelta.amount1()) : uint128(swapDelta.amount0());
            }
        }
        amountOut.revertQuote();
    }

    /// @dev quote an ExactOutput swap along a path of tokens, then revert with the result
    function _quoteExactOutput(QuoteExactParams calldata params) external selfOnly returns (bytes memory) {
        uint256 pathLength = params.path.length;
        BalanceDelta swapDelta;
        uint128 amountOut = params.exactAmount;
        Currency outputCurrency = params.exactCurrency;
        PathKey calldata pathKey;

        for (uint256 i = pathLength; i > 0; i--) {
            pathKey = params.path[i - 1];
            (PoolKey memory poolKey, bool oneForZero) = pathKey.getPoolAndSwapDirection(outputCurrency);

            swapDelta = _swap(poolKey, !oneForZero, amountOut.safeInt128(), pathKey.hookData);

            amountOut = oneForZero ? uint128(-swapDelta.amount1()) : uint128(-swapDelta.amount0());
            outputCurrency = pathKey.intermediateCurrency;
        }
        // amountOut after the loop exits actually holds the amountIn of the trade
        amountOut.revertQuote();
    }

    /// @dev quote an ExactOutput swap on a pool, then revert with the result
    function _quoteExactOutputSingle(QuoteExactSingleParams calldata params) external selfOnly returns (bytes memory) {
        BalanceDelta swapDelta =
            _swap(params.poolKey, params.zeroForOne, params.exactAmount.safeInt128(), params.hookData);

        // the input delta of a swap is negative so we must flip it
        uint256 amountIn = params.zeroForOne ? uint128(-swapDelta.amount0()) : uint128(-swapDelta.amount1());
        amountIn.revertQuote();
    }

    /// @dev Execute a swap and return the balance delta
    /// @notice if amountSpecified < 0, the swap is exactInput, otherwise exactOutput
    function _swap(PoolKey memory poolKey, bool zeroForOne, int128 amountSpecified, bytes memory hookData)
        private
        returns (BalanceDelta deltas)
    {
        deltas = poolManager.swap(poolKey, zeroForOne, amountSpecified, hookData);

        /// @dev Check that the pool was not illiquid
        /// even BinPool will emit BinPool__OutOfLiquidity when the pool is illiquid
        /// We still need to apply the check in case hook contract manipulates the delta
        int128 amountSpecifiedActual = (zeroForOne == (amountSpecified < 0)) ? deltas.amount0() : deltas.amount1();
        if (amountSpecifiedActual != amountSpecified) {
            revert NotEnoughLiquidity(poolKey.toId());
        }
    }
}
```

---

## 9. UniversalRouter

**Address:** `0x9a554202Ff6E62e5533D394330D0A4B57efF7C7a`  
**Deployed:** November 18, 2025  
**File:** `src/infinity-universal-router/UniversalRouter.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity 0.8.20;

// Command implementations
import {Dispatcher} from "./base/Dispatcher.sol";
import {RouterParameters, RouterImmutables} from "./base/RouterImmutables.sol";
import {InfinitySwapRouter} from "./modules/pancakeswap/infinity/InfinitySwapRouter.sol";
import {Commands} from "./libraries/Commands.sol";
import {Constants} from "./libraries/Constants.sol";
import {IUniversalRouter} from "./interfaces/IUniversalRouter.sol";
import {StableSwapRouter} from "./modules/pancakeswap/StableSwapRouter.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract UniversalRouter is RouterImmutables, IUniversalRouter, Dispatcher, Pausable {
    constructor(RouterParameters memory params)
        RouterImmutables(params)
        StableSwapRouter(params.stableFactory, params.stableInfo)
        InfinitySwapRouter(params.infiVault, params.infiClPoolManager, params.infiBinPoolManager)
    {}

    modifier checkDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert TransactionDeadlinePassed();
        _;
    }

    /// @notice To receive ETH from WETH
    receive() external payable {
        if (msg.sender != address(WETH9) && msg.sender != address(vault)) revert InvalidEthSender();
    }

    /// @inheritdoc IUniversalRouter
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline)
        external
        payable
        checkDeadline(deadline)
    {
        execute(commands, inputs);
    }

    /// @inheritdoc Dispatcher
    function execute(bytes calldata commands, bytes[] calldata inputs)
        public
        payable
        override
        isNotLocked
        whenNotPaused
    {
        bool success;
        bytes memory output;
        uint256 numCommands = commands.length;
        if (inputs.length != numCommands) revert LengthMismatch();

        // loop through all given commands, execute them and pass along outputs as defined
        for (uint256 commandIndex = 0; commandIndex < numCommands; commandIndex++) {
            bytes1 command = commands[commandIndex];

            bytes calldata input = inputs[commandIndex];

            (success, output) = dispatch(command, input);

            if (!success && successRequired(command)) {
                revert ExecutionFailed({commandIndex: commandIndex, message: output});
            }
        }
    }

    function successRequired(bytes1 command) internal pure returns (bool) {
        return command & Commands.FLAG_ALLOW_REVERT == 0;
    }

    /**
     * @dev called by the owner to pause, triggers stopped state
     */
    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    /**
     * @dev called by the owner to unpause, returns to normal state
     */
    function unpause() external onlyOwner whenPaused {
        _unpause();
    }
}
```

---

## 10. MixedQuoter

**Address:** `0x82b5d24754AAB72AbF2D4025Cb58F8321c3d0305`  
**Deployed:** November 18, 2025  
**File:** `src/infinity-periphery/MixedQuoter.sol`

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2024 PancakeSwap
pragma solidity 0.8.20;

import {PoolKey} from "infinity-core/types/PoolKey.sol";
import {CurrencyLibrary, Currency, equals} from "infinity-core/types/Currency.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {TickMath} from "infinity-core/pool-cl/libraries/TickMath.sol";
import {IQuoter} from "./interfaces/IQuoter.sol";
import {ICLQuoter} from "./pool-cl/interfaces/ICLQuoter.sol";
import {IBinQuoter} from "./pool-bin/interfaces/IBinQuoter.sol";
import {IPancakeV3Pool} from "./interfaces/external/IPancakeV3Pool.sol";
import {IPancakeV3SwapCallback} from "./interfaces/external/IPancakeV3SwapCallback.sol";
import {IStableSwap} from "./interfaces/external/IStableSwap.sol";
import {V3PoolTicksCounter} from "./libraries/external/V3PoolTicksCounter.sol";
import {V3SmartRouterHelper} from "./libraries/external/V3SmartRouterHelper.sol";
import {IMixedQuoter} from "./interfaces/IMixedQuoter.sol";
import {MixedQuoterActions} from "./libraries/MixedQuoterActions.sol";
import {MixedQuoterRecorder} from "./libraries/MixedQuoterRecorder.sol";
import {Multicall} from "./base/Multicall.sol";

/// @title Provides on chain quotes for infinity, V3, V2, Stable and MixedRoute exact input swaps
/// @notice Allows getting the expected amount out for a given swap without executing the swap
/// @notice Does not support exact output swaps since using the contract balance between exactOut swaps is not supported
/// @dev These functions are not gas efficient and should _not_ be called on chain. Instead, optimistically execute
/// the swap and check the amounts in the callback.
contract MixedQuoter is IMixedQuoter, IPancakeV3SwapCallback, Multicall {
    using SafeCast for *;
    using V3PoolTicksCounter for IPancakeV3Pool;

    address constant ZERO_ADDRESS = address(0);

    address public immutable WETH9;
    address public immutable factoryV3;
    address public immutable factoryV2;
    address public immutable factoryStable;

    ICLQuoter public immutable clQuoter;
    IBinQuoter public immutable binQuoter;

    constructor(
        address _factoryV3,
        address _factoryV2,
        address _factoryStable,
        address _WETH9,
        ICLQuoter _clQuoter,
        IBinQuoter _binQuoter
    ) {
        if (
            _factoryV3 == ZERO_ADDRESS || _factoryV2 == ZERO_ADDRESS || _factoryStable == ZERO_ADDRESS
                || _WETH9 == ZERO_ADDRESS || address(_clQuoter) == ZERO_ADDRESS || address(_binQuoter) == ZERO_ADDRESS
        ) {
            revert INVALID_ADDRESS();
        }
        factoryV3 = _factoryV3;
        WETH9 = _WETH9;
        factoryV2 = _factoryV2;
        factoryStable = _factoryStable;
        clQuoter = _clQuoter;
        binQuoter = _binQuoter;
    }

    /**
     * V3 *************************************************
     */

    /// @inheritdoc IPancakeV3SwapCallback
    function pancakeV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes memory data)
        external
        view
        override
    {
        require(amount0Delta > 0 || amount1Delta > 0); // swaps entirely within 0-liquidity regions are not supported
        (address tokenIn, address tokenOut, uint24 fee) = abi.decode(data, (address, address, uint24));
        V3SmartRouterHelper.verifyCallback(factoryV3, tokenIn, tokenOut, fee);

        (bool isExactInput, uint256 amountReceived) = amount0Delta > 0
            ? (tokenIn < tokenOut, uint256(-amount1Delta))
            : (tokenOut < tokenIn, uint256(-amount0Delta));

        IPancakeV3Pool pool = V3SmartRouterHelper.getPool(factoryV3, tokenIn, tokenOut, fee);
        (uint160 v3SqrtPriceX96After, int24 tickAfter,,,,,) = pool.slot0();

        if (isExactInput) {
            assembly ("memory-safe") {
                let ptr := mload(0x40)
                mstore(ptr, amountReceived)
                mstore(add(ptr, 0x20), v3SqrtPriceX96After)
                mstore(add(ptr, 0x40), tickAfter)
                revert(ptr, 0x60)
            }
        } else {
            /// since we don't support exactOutput, revert here
            revert("Exact output quote not supported");
        }
    }

    /// @dev Parses a revert reason that should contain the numeric quote
    function parseRevertReason(bytes memory reason)
        private
        pure
        returns (uint256 amount, uint160 sqrtPriceX96After, int24 tickAfter)
    {
        if (reason.length != 0x60) {
            if (reason.length < 0x44) revert("Unexpected error");
            assembly ("memory-safe") {
                reason := add(reason, 0x04)
            }
            revert(abi.decode(reason, (string)));
        }
        return abi.decode(reason, (uint256, uint160, int24));
    }

    function handleV3Revert(bytes memory reason, IPancakeV3Pool pool, uint256 gasEstimate)
        private
        view
        returns (uint256 amount, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256)
    {
        int24 tickBefore;
        int24 tickAfter;
        (, tickBefore,,,,,) = pool.slot0();
        (amount, sqrtPriceX96After, tickAfter) = parseRevertReason(reason);

        initializedTicksCrossed = pool.countInitializedTicksCrossed(tickBefore, tickAfter);

        return (amount, sqrtPriceX96After, initializedTicksCrossed, gasEstimate);
    }

    /// @dev Fetch an exactIn quote for a V3 Pool on chain
    function quoteExactInputSingleV3(QuoteExactInputSingleV3Params memory params)
        public
        override
        returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)
    {
        bool zeroForOne = params.tokenIn < params.tokenOut;
        IPancakeV3Pool pool = V3SmartRouterHelper.getPool(factoryV3, params.tokenIn, params.tokenOut, params.fee);

        uint256 gasBefore = gasleft();
        try pool.swap(
            address(this), // address(0) might cause issues with some tokens
            zeroForOne,
            params.amountIn.toInt256(),
            params.sqrtPriceLimitX96 == 0
                ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                : params.sqrtPriceLimitX96,
            abi.encode(params.tokenIn, params.tokenOut, params.fee)
        ) {} catch (bytes memory reason) {
            gasEstimate = gasBefore - gasleft();
            return handleV3Revert(reason, pool, gasEstimate);
        }
    }

    /**
     * V2 *************************************************
     */

    /// @dev Fetch an exactIn quote for a V2 pair on chain
    function quoteExactInputSingleV2(QuoteExactInputSingleV2Params memory params)
        public
        view
        override
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        return quoteExactInputSingleV2WithAccumulation(params, 0, 0);
    }

    /// @dev Fetch an exactIn quote for a V2 pair on chain with token accumulation
    function quoteExactInputSingleV2WithAccumulation(
        QuoteExactInputSingleV2Params memory params,
        uint256 accTokenInAmount,
        uint256 accTokenOutAmount
    ) internal view returns (uint256 amountOut, uint256 gasEstimate) {
        uint256 gasBefore = gasleft();
        (uint256 reserveIn, uint256 reserveOut) =
            V3SmartRouterHelper.getReserves(factoryV2, params.tokenIn, params.tokenOut);
        amountOut = V3SmartRouterHelper.getAmountOut(
            params.amountIn, reserveIn + accTokenInAmount, reserveOut - accTokenOutAmount
        );
        gasEstimate = gasBefore - gasleft();
    }

    /**
     * Stable *************************************************
     */

    /// @dev Fetch an exactIn quote for a Stable pair on chain
    function quoteExactInputSingleStable(QuoteExactInputSingleStableParams memory params)
        public
        view
        override
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        uint256 gasBefore = gasleft();
        (uint256 i, uint256 j, address swapContract) =
            V3SmartRouterHelper.getStableInfo(factoryStable, params.tokenIn, params.tokenOut, params.flag);
        amountOut = IStableSwap(swapContract).get_dy(i, j, params.amountIn);
        gasEstimate = gasBefore - gasleft();
    }

    /**
     * Mixed *************************************************
     */
    /// @dev All swap results will influence the outcome of subsequent swaps within the same pool
    function quoteMixedExactInputSharedContext(
        address[] calldata paths,
        bytes calldata actions,
        bytes[] calldata params,
        uint256 amountIn
    ) external override returns (uint256 amountOut, uint256 gasEstimate) {
        return quoteMixedExactInputWithContext(paths, actions, params, amountIn, true);
    }

    function quoteMixedExactInput(
        address[] calldata paths,
        bytes calldata actions,
        bytes[] calldata params,
        uint256 amountIn
    ) external override returns (uint256 amountOut, uint256 gasEstimate) {
        return quoteMixedExactInputWithContext(paths, actions, params, amountIn, false);
    }

    /// @dev if withContext is false, each swap is isolated and does not influence the outcome of subsequent swaps within the same pool
    /// @dev if withContext is true, all swap results will influence the outcome of subsequent swaps within the same pool
    /// @dev if withContext is true, non-infinity pools (v3, v2, ss) only support one swap direction for same pool
    function quoteMixedExactInputWithContext(
        address[] calldata paths,
        bytes calldata actions,
        bytes[] calldata params,
        uint256 amountIn,
        bool withContext
    ) private returns (uint256 amountOut, uint256 gasEstimate) {
        uint256 numActions = actions.length;
        if (numActions == 0) revert NoActions();
        if (numActions != params.length || numActions != paths.length - 1) revert InputLengthMismatch();

        for (uint256 actionIndex = 0; actionIndex < numActions; actionIndex++) {
            uint256 gasEstimateForCurAction;
            address tokenIn = paths[actionIndex];
            address tokenOut = paths[actionIndex + 1];
            if (tokenIn == tokenOut) revert InvalidPath();

            uint256 action = uint256(uint8(actions[actionIndex]));
            if (action == MixedQuoterActions.V2_EXACT_INPUT_SINGLE) {
                (tokenIn, tokenOut) = convertNativeToWETH(tokenIn, tokenOut);
                // params[actionIndex] is zero bytes
                if (!withContext) {
                    (amountIn, gasEstimateForCurAction) = quoteExactInputSingleV2(
                        QuoteExactInputSingleV2Params({tokenIn: tokenIn, tokenOut: tokenOut, amountIn: amountIn})
                    );
                } else {
                    bool zeroForOne = tokenIn < tokenOut;
                    bytes32 poolHash = MixedQuoterRecorder.getV2PoolHash(tokenIn, tokenOut);
                    // update v2 pool swap direction, only allow one direction in one transaction
                    MixedQuoterRecorder.setAndCheckSwapDirection(poolHash, zeroForOne);
                    (uint256 accAmountIn, uint256 accAmountOut) =
                        MixedQuoterRecorder.getPoolSwapTokenAccumulation(poolHash, zeroForOne);

                    uint256 swapAmountOut;
                    (swapAmountOut, gasEstimateForCurAction) = quoteExactInputSingleV2WithAccumulation(
                        QuoteExactInputSingleV2Params({tokenIn: tokenIn, tokenOut: tokenOut, amountIn: amountIn}),
                        accAmountIn,
                        accAmountOut
                    );
                    MixedQuoterRecorder.setPoolSwapTokenAccumulation(
                        poolHash, amountIn + accAmountIn, swapAmountOut + accAmountOut, zeroForOne
                    );
                    amountIn = swapAmountOut;
                }
            } else if (action == MixedQuoterActions.V3_EXACT_INPUT_SINGLE) {
                (tokenIn, tokenOut) = convertNativeToWETH(tokenIn, tokenOut);
                // params[actionIndex]: abi.encode(fee)
                uint24 fee = abi.decode(params[actionIndex], (uint24));
                if (!withContext) {
                    (amountIn,,, gasEstimateForCurAction) = quoteExactInputSingleV3(
                        QuoteExactInputSingleV3Params({
                            tokenIn: tokenIn,
                            tokenOut: tokenOut,
                            amountIn: amountIn,
                            fee: fee,
                            sqrtPriceLimitX96: 0
                        })
                    );
                } else {
                    bool zeroForOne = tokenIn < tokenOut;
                    bytes32 poolHash = MixedQuoterRecorder.getV3PoolHash(tokenIn, tokenOut, fee);
                    // update v3 pool swap direction, only allow one direction in one transaction
                    MixedQuoterRecorder.setAndCheckSwapDirection(poolHash, zeroForOne);
                    (uint256 accAmountIn, uint256 accAmountOut) =
                        MixedQuoterRecorder.getPoolSwapTokenAccumulation(poolHash, zeroForOne);

                    uint256 swapAmountOut;
                    amountIn += accAmountIn;
                    (swapAmountOut,,, gasEstimateForCurAction) = quoteExactInputSingleV3(
                        QuoteExactInputSingleV3Params({
                            tokenIn: tokenIn,
                            tokenOut: tokenOut,
                            amountIn: amountIn,
                            fee: fee,
                            sqrtPriceLimitX96: 0
                        })
                    );
                    MixedQuoterRecorder.setPoolSwapTokenAccumulation(poolHash, amountIn, swapAmountOut, zeroForOne);
                    amountIn = swapAmountOut - accAmountOut;
                }
            } else if (action == MixedQuoterActions.INFI_CL_EXACT_INPUT_SINGLE) {
                QuoteMixedInfiExactInputSingleParams memory clParams =
                    abi.decode(params[actionIndex], (QuoteMixedInfiExactInputSingleParams));
                (tokenIn, tokenOut) = convertWETHToInfiNativeCurrency(clParams.poolKey, tokenIn, tokenOut);
                bool zeroForOne = tokenIn < tokenOut;
                checkInfiPoolKeyCurrency(clParams.poolKey, zeroForOne, tokenIn, tokenOut);

                IQuoter.QuoteExactSingleParams memory swapParams = IQuoter.QuoteExactSingleParams({
                    poolKey: clParams.poolKey,
                    zeroForOne: zeroForOne,
                    exactAmount: amountIn.toUint128(),
                    hookData: clParams.hookData
                });
                // will execute all swap history of same infinity pool in one transaction if withContext is true
                if (withContext) {
                    bytes32 poolHash = MixedQuoterRecorder.getInfiCLPoolHash(clParams.poolKey);
                    bytes memory swapListBytes = MixedQuoterRecorder.getInfiPoolSwapList(poolHash);
                    IQuoter.QuoteExactSingleParams[] memory swapHistoryList;
                    uint256 swapHistoryListLength;
                    if (swapListBytes.length > 0) {
                        swapHistoryList = abi.decode(swapListBytes, (IQuoter.QuoteExactSingleParams[]));

                        swapHistoryListLength = swapHistoryList.length;
                    }
                    IQuoter.QuoteExactSingleParams[] memory swapList =
                        new IQuoter.QuoteExactSingleParams[](swapHistoryListLength + 1);
                    for (uint256 i = 0; i < swapHistoryListLength; i++) {
                        swapList[i] = swapHistoryList[i];
                    }
                    swapList[swapHistoryListLength] = swapParams;

                    (amountIn, gasEstimateForCurAction) = clQuoter.quoteExactInputSingleList(swapList);
                    swapListBytes = abi.encode(swapList);
                    MixedQuoterRecorder.setInfiPoolSwapList(poolHash, swapListBytes);
                } else {
                    (amountIn, gasEstimateForCurAction) = clQuoter.quoteExactInputSingle(swapParams);
                }
            } else if (action == MixedQuoterActions.INFI_BIN_EXACT_INPUT_SINGLE) {
                QuoteMixedInfiExactInputSingleParams memory binParams =
                    abi.decode(params[actionIndex], (QuoteMixedInfiExactInputSingleParams));
                (tokenIn, tokenOut) = convertWETHToInfiNativeCurrency(binParams.poolKey, tokenIn, tokenOut);
                bool zeroForOne = tokenIn < tokenOut;
                checkInfiPoolKeyCurrency(binParams.poolKey, zeroForOne, tokenIn, tokenOut);

                IQuoter.QuoteExactSingleParams memory swapParams = IQuoter.QuoteExactSingleParams({
                    poolKey: binParams.poolKey,
                    zeroForOne: zeroForOne,
                    exactAmount: amountIn.toUint128(),
                    hookData: binParams.hookData
                });
                // will execute all swap history of same infinity pool in one transaction if withContext is true
                if (withContext) {
                    bytes32 poolHash = MixedQuoterRecorder.getInfiBinPoolHash(binParams.poolKey);
                    bytes memory swapListBytes = MixedQuoterRecorder.getInfiPoolSwapList(poolHash);
                    IQuoter.QuoteExactSingleParams[] memory swapHistoryList;
                    uint256 swapHistoryListLength;
                    if (swapListBytes.length > 0) {
                        swapHistoryList = abi.decode(swapListBytes, (IQuoter.QuoteExactSingleParams[]));

                        swapHistoryListLength = swapHistoryList.length;
                    }
                    IQuoter.QuoteExactSingleParams[] memory swapList =
                        new IQuoter.QuoteExactSingleParams[](swapHistoryListLength + 1);
                    for (uint256 i = 0; i < swapHistoryListLength; i++) {
                        swapList[i] = swapHistoryList[i];
                    }
                    swapList[swapHistoryListLength] = swapParams;

                    (amountIn, gasEstimateForCurAction) = binQuoter.quoteExactInputSingleList(swapList);
                    swapListBytes = abi.encode(swapList);
                    MixedQuoterRecorder.setInfiPoolSwapList(poolHash, swapListBytes);
                } else {
                    (amountIn, gasEstimateForCurAction) = binQuoter.quoteExactInputSingle(swapParams);
                }
            } else if (action == MixedQuoterActions.SS_2_EXACT_INPUT_SINGLE) {
                (tokenIn, tokenOut) = convertNativeToWETH(tokenIn, tokenOut);
                // params[actionIndex] is zero bytes

                if (!withContext) {
                    (amountIn, gasEstimateForCurAction) = quoteExactInputSingleStable(
                        QuoteExactInputSingleStableParams({
                            tokenIn: tokenIn,
                            tokenOut: tokenOut,
                            amountIn: amountIn,
                            flag: 2
                        })
                    );
                } else {
                    bool zeroForOne = tokenIn < tokenOut;
                    bytes32 poolHash = MixedQuoterRecorder.getSSPoolHash(tokenIn, tokenOut);
                    // update stable pool swap direction, only allow one direction in one transaction
                    MixedQuoterRecorder.setAndCheckSwapDirection(poolHash, zeroForOne);
                    (uint256 accAmountIn, uint256 accAmountOut) =
                        MixedQuoterRecorder.getPoolSwapTokenAccumulation(poolHash, zeroForOne);
                    uint256 swapAmountOut;
                    amountIn += accAmountIn;
                    (swapAmountOut, gasEstimateForCurAction) = quoteExactInputSingleStable(
                        QuoteExactInputSingleStableParams({
                            tokenIn: tokenIn,
                            tokenOut: tokenOut,
                            amountIn: amountIn,
                            flag: 2
                        })
                    );
                    MixedQuoterRecorder.setPoolSwapTokenAccumulation(poolHash, amountIn, swapAmountOut, zeroForOne);
                    amountIn = swapAmountOut - accAmountOut;
                }
            } else if (action == MixedQuoterActions.SS_3_EXACT_INPUT_SINGLE) {
                /// @dev PCS do not support three pool stable swap, so will skip context mode
                (tokenIn, tokenOut) = convertNativeToWETH(tokenIn, tokenOut);
                // params[actionIndex] is zero bytes
                (amountIn, gasEstimateForCurAction) = quoteExactInputSingleStable(
                    QuoteExactInputSingleStableParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        amountIn: amountIn,
                        flag: 3
                    })
                );
            } else {
                revert UnsupportedAction(action);
            }
            gasEstimate += gasEstimateForCurAction;
        }

        return (amountIn, gasEstimate);
    }

    /// @dev Check if the poolKey currency matches the tokenIn and tokenOut
    function checkInfiPoolKeyCurrency(PoolKey memory poolKey, bool isZeroForOne, address tokenIn, address tokenOut)
        private
        pure
    {
        Currency currency0;
        Currency currency1;
        if (isZeroForOne) {
            currency0 = Currency.wrap(tokenIn);
            currency1 = Currency.wrap(tokenOut);
        } else {
            currency0 = Currency.wrap(tokenOut);
            currency1 = Currency.wrap(tokenIn);
        }
        if (!equals(poolKey.currency0, currency0) || !equals(poolKey.currency1, currency1)) {
            revert InvalidPoolKeyCurrency();
        }
    }

    /// @notice Convert WETH to native currency for infinity pools
    /// @dev for example, quote route are v3 WETH pool[token0, WETH] and infinity native pool[NATIVE,token1]
    /// paths is [token0, WETH, token1], we need to convert WETH to NATIVE when quote infinity pool
    function convertWETHToInfiNativeCurrency(PoolKey memory poolKey, address tokenIn, address tokenOut)
        private
        view
        returns (address, address)
    {
        if (poolKey.currency0.isNative()) {
            if (tokenIn == WETH9) {
                tokenIn = Currency.unwrap(CurrencyLibrary.NATIVE);
            }
            if (tokenOut == WETH9) {
                tokenOut = Currency.unwrap(CurrencyLibrary.NATIVE);
            }
        }
        return (tokenIn, tokenOut);
    }

    /// @dev Convert native currency to WETH for Non-Infinity pools.
    /// For example, quote route are infinity native pool[NATIVE, token0] and v3 WETH pool[WETH, token1].
    //// paths is [token0, NATIVE, token1], we need to convert NATIVE to WETH when quote v3 pool
    function convertNativeToWETH(address tokenIn, address tokenOut) private view returns (address, address) {
        if (Currency.wrap(tokenIn).isNative()) {
            tokenIn = WETH9;
        }
        if (Currency.wrap(tokenOut).isNative()) {
            tokenOut = WETH9;
        }
        return (tokenIn, tokenOut);
    }
}
```

---

## Appendix: Compilation Settings

**Solidity Version:** 0.8.20  
**EVM Version:** Shanghai  
**Optimizer:** Enabled  
**Optimizer Runs:** 200  

**Deployment Command:**
```bash
forge script script/DeployPeripheryEssential.s.sol --rpc-url https://rpc.fushuma.com --broadcast --legacy
```

---

**Document Generated:** November 19, 2025  
**Total Contracts:** 10  
**Total Lines of Code:** ~2,758 lines

