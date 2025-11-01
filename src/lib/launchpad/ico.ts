// ICO data fetching functions for Fushuma Launchpad

import { ethers } from 'ethers';
import LaunchpadABI from '@/config/abis/Launchpad.json';
import VestingImplementationABI from '@/config/abis/VestingImplementation.json';
import {
  LAUNCHPAD_PROXY_ADDRESS,
  FUSHUMA_RPC_URL,
} from './contracts';
import type {
  IIcoInfo,
  IIcoInfoWithKey,
  IPurchaseAmount,
  IUserPurchaseWithKey,
  IUserPurchase,
  IcoStatusInfo,
} from './types';
import { IcoStatus } from './types';

// Create provider for read-only operations
const provider = new ethers.providers.JsonRpcProvider(FUSHUMA_RPC_URL);

// Create contract instance for read operations
const launchpadContract = new ethers.Contract(
  LAUNCHPAD_PROXY_ADDRESS,
  LaunchpadABI,
  provider
);

/**
 * Map raw contract data to IIcoInfo structure
 */
function mapEvmIcoToIIcoInfo(index: number, params: any, state: any): IIcoInfoWithKey {
  return {
    key: params.token.toString(),
    data: {
      seed: index,
      owner: state.ICOOwner,
      icoMint: params.token,
      icoDecimals: 10 ** Number(state.icoTokenDecimals),
      amount: Number(params.amount),
      costMint: params.paymentToken,
      startPrice: BigInt(params.startPrice),
      endPrice: BigInt(params.endPrice),
      startDate: Number(params.startDate) * 1000,
      endDate: Number(params.endDate) * 1000,
      bonusReserve: Number(params.bonusReserve),
      bonusPercentage: Number(params.bonusPercentage),
      bonusActivator: Number(params.bonusActivator),
      isClosed: state.isClosed ? 1 : 0,
      totalSold: Number(state.totalSold),
      totalReceived: Number(state.totalReceived),
      unlockPercentage: Number(params.vestingParams.unlockPercentage),
      cliffPeriod: Number(params.vestingParams.cliffPeriod),
      vestingPercentage: Number(params.vestingParams.vestingPercentage),
      vestingInterval: Number(params.vestingParams.vestingInterval),
      purchaseSeqNum: 0,
      vestingContracts: state.vestingContract || null,
    },
  };
}

/**
 * Fetch all ICOs from the smart contract
 */
export async function fetchAllICOs(): Promise<IIcoInfoWithKey[]> {
  try {
    const total = await launchpadContract.counter();
    const results: IIcoInfoWithKey[] = [];

    // Start from index 26 as per original implementation
    for (let i = 26; i < Number(total); i++) {
      const ico = await launchpadContract.getICO(i);
      const { 0: params, 1: state } = ico;
      results.push(mapEvmIcoToIIcoInfo(i, params, state));
    }

    return results;
  } catch (err) {
    console.error('Failed to fetch ICOs:', err);
    return [];
  }
}

/**
 * Fetch a specific ICO by index
 */
export async function fetchICO(index: number): Promise<IIcoInfoWithKey | null> {
  try {
    const ico = await launchpadContract.getICO(index);
    const { 0: params, 1: state } = ico;
    return mapEvmIcoToIIcoInfo(index, params, state);
  } catch (err) {
    console.error('Failed to fetch ICO:', err);
    return null;
  }
}

/**
 * Calculate purchase cost and available amount
 */
export async function getEvmCostInfo(
  id: number,
  amount: bigint
): Promise<IPurchaseAmount | null> {
  try {
    if (!id || id < 0) return null;
    const result = await launchpadContract.getValue(id, amount);
    const { 0: availableAmount, 1: value } = result;

    return {
      value,
      availableAmount,
    };
  } catch (error) {
    console.error('Failed to get EVM Cost Info', error);
    return null;
  }
}

/**
 * Get ICO status based on current state
 */
export function getStatus(
  isClosed: number,
  amount: number,
  totalSold: number,
  startDate: string,
  currentDate: string,
  endDate: string
): IcoStatusInfo {
  const now = Number(currentDate);
  const start = Number(startDate);
  const end = Number(endDate);

  if (isClosed) {
    return { status: IcoStatus.Closed, color: 'gray' };
  }
  if (totalSold >= amount) {
    return { status: IcoStatus.SoldOut, color: 'red' };
  }
  if (now < start) {
    return { status: IcoStatus.Upcoming, color: 'blue' };
  }
  if (end && now > end) {
    return { status: IcoStatus.Ended, color: 'yellow' };
  }
  return { status: IcoStatus.Live, color: 'green' };
}

/**
 * Calculate current price for an ICO with dynamic pricing
 */
export function calculateCurrentPrice(
  startPrice: bigint,
  endPrice: bigint,
  totalSold: number,
  totalAmount: number,
  icoDecimals: number
): number {
  // Fixed price if endPrice is 0
  if (Number(endPrice) === 0) {
    return Number(startPrice) / icoDecimals;
  }

  // Linear price increase based on amount sold
  const increase =
    BigInt(startPrice) +
    ((BigInt(endPrice) - BigInt(startPrice)) * BigInt(totalSold)) / BigInt(totalAmount);

  return Number(increase) / icoDecimals;
}

/**
 * Find closest block by timestamp (binary search)
 */
async function findClosestBlockByTimestamp(targetTimestamp: number): Promise<number> {
  let latestBlockNumber = await provider.getBlockNumber();
  let earliest = 0;
  let latest = latestBlockNumber;

  while (earliest <= latest) {
    const middle = Math.floor((earliest + latest) / 2);
    const block = await provider.getBlock(middle);

    if (!block) break;

    const blockTimestamp = block.timestamp;

    if (blockTimestamp < targetTimestamp) {
      earliest = middle + 1;
    } else if (blockTimestamp > targetTimestamp) {
      latest = middle - 1;
    } else {
      return middle; // Exact match
    }
  }

  return latest;
}

/**
 * Query event logs in chunks to avoid RPC limits
 */
async function queryLogsInChunks(
  contract: ethers.Contract,
  filter: any,
  fromBlock: number,
  toBlock: number,
  chunkSize = 1000
) {
  let logs: any[] = [];

  for (let start = fromBlock; start <= toBlock; start += chunkSize + 1) {
    const end = Math.min(start + chunkSize, toBlock);
    const chunkLogs = await contract.queryFilter(filter, start, end);
    logs = logs.concat(chunkLogs);
  }

  return logs;
}

/**
 * Get purchase history for a specific buyer and ICO
 */
export async function getBuyHistory(
  buyerAddress: string,
  icoId: number,
  vestUnlockPercentage: number
) {
  try {
    const ico = await launchpadContract.getICO(icoId);
    const { 0: params } = ico;
    const startTimestamp = parseInt(params.startDate);
    const startBlock = await findClosestBlockByTimestamp(startTimestamp);
    const latestBlock = await provider.getBlockNumber();

    const buyEventFilter = launchpadContract.filters.BuyToken();
    const logs = await queryLogsInChunks(
      launchpadContract,
      buyEventFilter,
      startBlock,
      latestBlock
    );

    const filtered = logs.filter(
      (log) =>
        log.args!.buyer.toLowerCase() === buyerAddress.toLowerCase() &&
        Number(log.args!.ICO_id) === icoId
    );

    filtered.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));

    return await Promise.all(
      filtered.map(async (e: any) => {
        const block = await provider.getBlock(e.blockNumber);
        if (!block) return null;

        return {
          seed: e.transactionHash,
          buyer: e.args.buyer,
          ico: Number(e.args.ICO_id),
          buyAmount: e.args.amountBought.toString(),
          buyDate: block.timestamp * 1000,
          bonus: e.args.bonus.toString(),
          lockedAmount: ((Number(e.args.amountBought) * vestUnlockPercentage) / 100).toString(),
          totalClaimed: 0,
        };
      })
    ).then((results) => results.filter((r) => r !== null));
  } catch (error) {
    console.error('Failed to get buy history:', error);
    return [];
  }
}

/**
 * Get vesting info as purchase records
 */
export async function getVestingInfoAsPurchases(
  vestingContractAddress: string,
  userAddress: string,
  icoId: string,
  unlockPercentage: number
): Promise<IUserPurchaseWithKey[]> {
  try {
    const vestingContract = new ethers.Contract(
      vestingContractAddress,
      VestingImplementationABI,
      provider
    );

    const [allocations, claimedRaw] = await Promise.all([
      vestingContract.getBeneficiary(userAddress),
      vestingContract.claimedAmount(userAddress),
    ]);

    const totalClaimed = Number(claimedRaw.toString());
    const claimedPerAlloc = allocations.length > 0 ? totalClaimed / allocations.length : 0;

    return allocations.map((alloc: any, index: number) => {
      const unlockedPortion = Number(alloc.amount.toString());
      const buyDate = Number(alloc.cliffFinish.toString()) * 1000;

      const purchase: IUserPurchase = {
        seed: index,
        buyer: userAddress,
        ico: icoId,
        buyAmount: unlockPercentage === 0 ? 0 : Number((unlockedPortion * 100) / unlockPercentage),
        buyDate: buyDate,
        bonus: 0,
        lockedAmount: unlockedPortion,
        totalClaimed: claimedPerAlloc,
      };

      return {
        key: `${userAddress}-${index}`,
        data: purchase,
      };
    });
  } catch (error) {
    console.error('Failed to get vesting info:', error);
    return [];
  }
}

/**
 * Get MetaMask provider
 */
export function getMetaMaskProvider(): any | null {
  if (typeof window === 'undefined') return null;

  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  const providers = ethereum.providers;

  // If multiple providers exist (MetaMask, Phantom, Brave, etc.)
  if (providers?.length) {
    const metamaskProvider = providers.find((p: any) => p.isMetaMask);
    return metamaskProvider || null;
  }

  // Fallback: window.ethereum is MetaMask
  if (ethereum.isMetaMask) {
    return ethereum;
  }

  return null;
}
