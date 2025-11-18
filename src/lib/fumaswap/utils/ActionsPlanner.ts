import {
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

// ABI definitions for each action type
const ACTIONS_ABI: Record<number, string> = {
  [ACTIONS.CL_MINT_POSITION]: '(address,address,int24,int24,bytes32,uint256,uint128,uint128,address,bytes)',
  [ACTIONS.CL_INCREASE_LIQUIDITY]: '(uint256,(address,address,int24,int24,bytes32),uint256,uint128,uint128,bytes)',
  [ACTIONS.SETTLE_PAIR]: '(address,address)',
  [ACTIONS.SWEEP]: '(address,address)',
  [ACTIONS.TAKE]: '(address,address,uint256)',
  [ACTIONS.CLOSE_CURRENCY]: '(address)',
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
      return encodeAbiParameters(parseAbiParameters(abi), plan.param as any);
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
