import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { UNISWAP_V3_FACTORY_ABI } from "@/config/abis/v3-factory";
import { UNISWAP_V3_POOL_ABI } from "@/config/abis/v3-pool";
import { WrappedToken } from "@/config/types/WrappedToken";
import { FeeAmount, TICK_SPACINGS, getSqrtRatioAtTick } from "@/utils/v3-math";
import { 
  nearestUsableTick, 
  getLiquidityForAmounts, 
  getAmount0Delta, 
  getAmount1Delta,
  validateTick 
} from "@/utils/v3-pool";
import { BigNumber } from "ethers";
import { parseUnits, formatUnits } from "viem";
import { useRecentTransactionsStore } from "@/stores/useRecentTransactions";
import addToast from "@/other/toast";
import { useTranslations } from "use-intl";

// V3 Factory address - this would need to be deployed and configured
const V3_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984"; // Mainnet Uniswap V3 Factory

export interface V3Position {
  tokenId: number;
  token0: WrappedToken;
  token1: WrappedToken;
  fee: FeeAmount;
  tickLower: number;
  tickUpper: number;
  liquidity: BigNumber;
  tokensOwed0: BigNumber;
  tokensOwed1: BigNumber;
  feeGrowthInside0LastX128: BigNumber;
  feeGrowthInside1LastX128: BigNumber;
}

export interface V3PoolInfo {
  address: string;
  token0: WrappedToken;
  token1: WrappedToken;
  fee: FeeAmount;
  sqrtPriceX96: BigNumber;
  tick: number;
  liquidity: BigNumber;
  feeGrowthGlobal0X128: BigNumber;
  feeGrowthGlobal1X128: BigNumber;
}

export default function useV3Liquidity() {
  const t = useTranslations("Toast");
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { addTransaction } = useRecentTransactionsStore();

  const [isLoading, setIsLoading] = useState(false);

  const getOrCreatePool = useCallback(async (
    token0: WrappedToken,
    token1: WrappedToken,
    fee: FeeAmount
  ): Promise<string | null> => {
    if (!publicClient) return null;

    try {
      // Check if pool exists
      let poolAddress = await publicClient.readContract({
        address: V3_FACTORY_ADDRESS as `0x${string}`,
        abi: UNISWAP_V3_FACTORY_ABI,
        functionName: "getPool",
        args: [token0.address as `0x${string}`, token1.address as `0x${string}`, fee]
      });

      if (poolAddress === "0x0000000000000000000000000000000000000000") {
        // Pool doesn't exist, create it
        if (!walletClient || !address) {
          throw new Error("Wallet not connected");
        }

        const { request } = await publicClient.simulateContract({
          address: V3_FACTORY_ADDRESS as `0x${string}`,
          abi: UNISWAP_V3_FACTORY_ABI,
          functionName: "createPool",
          args: [token0.address as `0x${string}`, token1.address as `0x${string}`, fee],
          account: address
        });

        const hash = await walletClient.writeContract(request);
        
        // Wait for transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash });

        // Get the new pool address
        poolAddress = await publicClient.readContract({
          address: V3_FACTORY_ADDRESS as `0x${string}`,
          abi: UNISWAP_V3_FACTORY_ABI,
          functionName: "getPool",
          args: [token0.address as `0x${string}`, token1.address as `0x${string}`, fee]
        });

        addToast(t("pool_created"), "success");
      }

      return poolAddress;
    } catch (error) {
      console.error("Error getting or creating pool:", error);
      return null;
    }
  }, [publicClient, walletClient, address, addTransaction, t]);

  const getPoolInfo = useCallback(async (
    token0: WrappedToken,
    token1: WrappedToken,
    fee: FeeAmount
  ): Promise<V3PoolInfo | null> => {
    if (!publicClient) return null;

    const poolAddress = await getOrCreatePool(token0, token1, fee);
    if (!poolAddress) return null;

    try {
      const [slot0, liquidity] = await Promise.all([
        publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: UNISWAP_V3_POOL_ABI,
          functionName: "slot0"
        }),
        publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: UNISWAP_V3_POOL_ABI,
          functionName: "liquidity"
        })
      ]);

      return {
        address: poolAddress,
        token0,
        token1,
        fee,
        sqrtPriceX96: BigNumber.from(slot0[0]),
        tick: slot0[1],
        liquidity: BigNumber.from(liquidity),
        feeGrowthGlobal0X128: BigNumber.from(0), // Would need additional contract calls
        feeGrowthGlobal1X128: BigNumber.from(0)  // Would need additional contract calls
      };
    } catch (error) {
      console.error("Error getting pool info:", error);
      return null;
    }
  }, [publicClient, getOrCreatePool]);

  const calculateOptimalAmounts = useCallback((
    amount0Desired: string,
    amount1Desired: string,
    token0: WrappedToken,
    token1: WrappedToken,
    tickLower: number,
    tickUpper: number,
    poolInfo: V3PoolInfo
  ) => {
    try {
      const amount0 = parseUnits(amount0Desired || "0", token0.decimals);
      const amount1 = parseUnits(amount1Desired || "0", token1.decimals);

      const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
      const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

      const liquidity = getLiquidityForAmounts(
        poolInfo.sqrtPriceX96,
        sqrtRatioAX96,
        sqrtRatioBX96,
        BigNumber.from(amount0.toString()),
        BigNumber.from(amount1.toString())
      );

      const amount0Optimal = getAmount0Delta(sqrtRatioAX96, sqrtRatioBX96, liquidity);
      const amount1Optimal = getAmount1Delta(sqrtRatioAX96, sqrtRatioBX96, liquidity);

      return {
        amount0: BigInt(amount0Optimal.toString()),
        amount1: BigInt(amount1Optimal.toString()),
        liquidity: BigInt(liquidity.toString())
      };
    } catch (error) {
      console.error("Error calculating optimal amounts:", error);
      return null;
    }
  }, []);

  const addLiquidity = useCallback(async (
    token0: WrappedToken,
    token1: WrappedToken,
    fee: FeeAmount,
    amount0Desired: string,
    amount1Desired: string,
    tickLower: number,
    tickUpper: number,
    slippageTolerance: number = 0.5
  ) => {
    if (!walletClient || !address || !publicClient) {
      addToast(t("wallet_not_connected"), "error");
      return;
    }

    setIsLoading(true);

    try {
      // Validate ticks
      if (!validateTick(tickLower, fee) || !validateTick(tickUpper, fee)) {
        throw new Error("Invalid tick range");
      }

      if (tickLower >= tickUpper) {
        throw new Error("Invalid tick range: tickLower must be less than tickUpper");
      }

      const poolInfo = await getPoolInfo(token0, token1, fee);
      if (!poolInfo) {
        throw new Error("Could not get pool info");
      }

      const optimalAmounts = calculateOptimalAmounts(
        amount0Desired,
        amount1Desired,
        token0,
        token1,
        tickLower,
        tickUpper,
        poolInfo
      );

      if (!optimalAmounts) {
        throw new Error("Could not calculate optimal amounts");
      }

      // Calculate minimum amounts with slippage protection
      const amount0Min = BigInt(Math.floor(Number(optimalAmounts.amount0) * (100 - slippageTolerance) / 100));
      const amount1Min = BigInt(Math.floor(Number(optimalAmounts.amount1) * (100 - slippageTolerance) / 100));

      // Mint liquidity
      const mintParams = {
        recipient: address,
        tickLower,
        tickUpper,
        amount: optimalAmounts.liquidity,
        data: "0x" // Empty data for basic minting
      };

      const { request } = await publicClient.simulateContract({
        address: poolInfo.address as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "mint",
        args: [
          mintParams.recipient,
          mintParams.tickLower,
          mintParams.tickUpper,
          mintParams.amount,
          mintParams.data
        ],
        account: address
      });

      const hash = await walletClient.writeContract(request);

      addTransaction({
        account: address,
        hash,
        chainId: chainId!,
        title: `Add V3 Liquidity ${token0.symbol}/${token1.symbol}`,
      }, address);

      addToast(t("liquidity_added"), "success");
      return hash;
    } catch (error) {
      console.error("Error adding liquidity:", error);
      addToast(t("something_went_wrong"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    walletClient,
    address,
    publicClient,
    chainId,
    getPoolInfo,
    calculateOptimalAmounts,
    addTransaction,
    t
  ]);

  const removeLiquidity = useCallback(async (
    poolAddress: string,
    tickLower: number,
    tickUpper: number,
    liquidity: BigNumber,
    amount0Min: BigNumber,
    amount1Min: BigNumber
  ) => {
    if (!walletClient || !address || !publicClient) {
      addToast(t("wallet_not_connected"), "error");
      return;
    }

    setIsLoading(true);

    try {
      // Burn liquidity
      const { request } = await publicClient.simulateContract({
        address: poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "burn",
        args: [tickLower, tickUpper, liquidity.toString()],
        account: address
      });

      const hash = await walletClient.writeContract(request);

      addTransaction({
        account: address,
        hash,
        chainId: chainId!,
        title: `Remove V3 Liquidity`,
      }, address);

      addToast(t("liquidity_removed"), "success");
      return hash;
    } catch (error) {
      console.error("Error removing liquidity:", error);
      addToast(t("something_went_wrong"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, address, publicClient, chainId, addTransaction, t]);

  const collectFees = useCallback(async (
    poolAddress: string,
    tickLower: number,
    tickUpper: number,
    amount0Max: BigNumber,
    amount1Max: BigNumber
  ) => {
    if (!walletClient || !address || !publicClient) {
      addToast(t("wallet_not_connected"), "error");
      return;
    }

    setIsLoading(true);

    try {
      const { request } = await publicClient.simulateContract({
        address: poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "collect",
        args: [address, tickLower, tickUpper, amount0Max.toString(), amount1Max.toString()],
        account: address
      });

      const hash = await walletClient.writeContract(request);

      addTransaction({
        account: address,
        hash,
        chainId: chainId!,
        title: `Collect V3 Fees`,
      }, address);

      addToast(t("fees_collected"), "success");
      return hash;
    } catch (error) {
      console.error("Error collecting fees:", error);
      addToast(t("something_went_wrong"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, address, publicClient, chainId, addTransaction, t]);

  return {
    getOrCreatePool,
    getPoolInfo,
    calculateOptimalAmounts,
    addLiquidity,
    removeLiquidity,
    collectFees,
    isLoading
  };
}
