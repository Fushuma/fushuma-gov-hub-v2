import {
  AbiParameter,
  Address,
  concat,
  encodeAbiParameters,
  Hex,
  parseAbiParameters,
  toHex,
  zeroAddress,
} from 'viem';
import { ACTIONS, ACTION_CONSTANTS } from './constants';
import { PoolKey } from '../types';

type Plan = {
  action: number;
  param: any[];
};

// ABI struct definitions matching PancakeSwap V4
const ABI_STRUCT_POOL_KEY = [
  'struct PoolKey { address currency0; address currency1; address hooks; address poolManager; uint24 fee; bytes32 parameters; }'
];

const ABI_STRUCT_POSITION_CONFIG = [
  'struct PositionConfig { PoolKey poolKey; int24 tickLower; int24 tickUpper; }',
  ...ABI_STRUCT_POOL_KEY
];

// ABI definitions for each action type
const ACTIONS_ABI: Record<number, readonly AbiParameter[]> = {
  [ACTIONS.CL_MINT_POSITION]: parseAbiParameters([
    'PositionConfig positionConfig, uint128 liquidity, uint128 amount0Max, uint128 amount1Max, address owner, bytes hookData',
    ...ABI_STRUCT_POSITION_CONFIG,
  ]),
  [ACTIONS.CL_INCREASE_LIQUIDITY]: parseAbiParameters([
    'uint256 tokenId, uint128 liquidity, uint128 amount0Max, uint128 amount1Max, bytes hookData',
    ...ABI_STRUCT_POSITION_CONFIG,
  ]),
  [ACTIONS.SETTLE_PAIR]: parseAbiParameters('address currency0, address currency1'),
  [ACTIONS.SWEEP]: parseAbiParameters('address currency, address to'),
  [ACTIONS.TAKE]: parseAbiParameters('address currency, address recipient, uint256 amount'),
  [ACTIONS.CLOSE_CURRENCY]: parseAbiParameters('address currency'),
};

export class ActionsPlanner {
  private plans: Plan[] = [];

  public add(action: number, param: any[]) {
    this.plans.push({ action, param });
  }

  public encode(): Hex {
    const encodeAbi = parseAbiParameters('bytes, bytes[]');
    const actions = concat(
      this.plans.map((plan) =>
        toHex(plan.action, {
          size: 1,
        })
      )
    );

    const params = this.plans.map((plan) => {
      const abi = ACTIONS_ABI[plan.action];
      if (!abi) {
        throw new Error(`No ABI defined for action ${plan.action}`);
      }
      return encodeAbiParameters(abi, plan.param as any);
    });

    return encodeAbiParameters(encodeAbi, [actions, params]);
  }

  /**
   * Pay and settle currency pair. User's token0 and token1 will be transferred from user and paid.
   * This is commonly used for increase liquidity or mint action.
   */
  public finalizeModifyLiquidityWithSettlePair(poolKey: PoolKey, sweepRecipient: Address) {
    this.add(ACTIONS.SETTLE_PAIR, [poolKey.currency0, poolKey.currency1]);
    if (poolKey.currency0 === zeroAddress) {
      this.add(ACTIONS.SWEEP, [poolKey.currency0, sweepRecipient]);
    }

    return this.encode();
  }
}
