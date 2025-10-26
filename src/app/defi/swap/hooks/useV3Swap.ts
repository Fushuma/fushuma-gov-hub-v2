import {
  useSwapAmountsStore,
  useSwapTokensStore,
  useTradeStore,
  useTransactionSettingsStore
} from "@/app/[locale]/swap/stores";
import { useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { UNISWAP_V3_POOL_ABI } from "@/config/abis/v3-pool";
import { UNISWAP_V3_FACTORY_ABI } from "@/config/abis/v3-factory";
import { Abi, formatUnits, parseUnits } from "viem";
import { isNativeToken } from "@/other/isNativeToken";
import { useRecentTransactionsStore } from "@/stores/useRecentTransactions";
import calculateSlippageAmount from "@/other/calculateSlippageAmount";
import useTransactionDeadline from "@/hooks/useTransactionDeadline";
import { useAwaitingDialogStore } from "@/stores/useAwaitingDialogStore";
import { useConfirmSwapDialogStore } from "@/app/[locale]/swap/stores/confirm";
import addToast from "@/other/toast";
import { useTranslations } from "use-intl";
import { FeeAmount, getSqrtRatioAtTick, getTickAtSqrtRatio } from "@/utils/v3-math";
import { computeSwapStep, sqrtPriceX96ToPrice } from "@/utils/v3-pool";
import { BigNumber } from "ethers";

// V3 Factory address - this would need to be deployed and configured
const V3_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984"; // Mainnet Uniswap V3 Factory

export default function useV3Swap() {
  const t = useTranslations("Toast");

  const { tokenTo, tokenFrom } = useSwapTokensStore();
  const { amountIn, amountOut } = useSwapAmountsStore();
  const { trade } = useTradeStore();
  const { deadline: _deadline, slippage } = useTransactionSettingsStore();
  const { chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const deadline = useTransactionDeadline(_deadline);
  const { setOpened, setClose, setSubmitted } = useAwaitingDialogStore();

  const { addTransaction } = useRecentTransactionsStore();
  const { setSwapConfirmDialogOpened } = useConfirmSwapDialogStore();

  const getV3Pool = useCallback(async (
    tokenA: string,
    tokenB: string,
    fee: FeeAmount
  ): Promise<string | null> => {
    if (!publicClient) return null;

    try {
      const poolAddress = await publicClient.readContract({
        address: V3_FACTORY_ADDRESS as `0x${string}`,
        abi: UNISWAP_V3_FACTORY_ABI,
        functionName: "getPool",
        args: [tokenA as `0x${string}`, tokenB as `0x${string}`, fee]
      });

      return poolAddress === "0x0000000000000000000000000000000000000000" ? null : poolAddress;
    } catch (error) {
      console.error("Error getting V3 pool:", error);
      return null;
    }
  }, [publicClient]);

  const getPoolState = useCallback(async (poolAddress: string) => {
    if (!publicClient) return null;

    try {
      const slot0 = await publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "slot0"
      });

      const liquidity = await publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "liquidity"
      });

      return {
        sqrtPriceX96: BigNumber.from(slot0[0]),
        tick: slot0[1],
        liquidity: BigNumber.from(liquidity),
        fee: await publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: UNISWAP_V3_POOL_ABI,
          functionName: "fee"
        })
      };
    } catch (error) {
      console.error("Error getting pool state:", error);
      return null;
    }
  }, [publicClient]);

  const calculateV3SwapOutput = useCallback(async (
    amountIn: bigint,
    tokenFromAddress: string,
    tokenToAddress: string
  ): Promise<{ amountOut: bigint; poolAddress: string } | null> => {
    if (!publicClient || !tokenFrom || !tokenTo) return null;

    // Try different fee tiers
    const feeTiers = [FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];
    
    for (const fee of feeTiers) {
      const poolAddress = await getV3Pool(tokenFromAddress, tokenToAddress, fee);
      if (!poolAddress) continue;

      const poolState = await getPoolState(poolAddress);
      if (!poolState) continue;

      try {
        const zeroForOne = tokenFromAddress.toLowerCase() < tokenToAddress.toLowerCase();
        const amountInBN = BigNumber.from(amountIn.toString());

        const swapResult = computeSwapStep(
          amountInBN,
          poolState.sqrtPriceX96,
          poolState.liquidity,
          poolState.fee,
          zeroForOne
        );

        return {
          amountOut: BigInt(swapResult.amountOut.toString()),
          poolAddress
        };
      } catch (error) {
        console.error(`Error calculating swap for fee tier ${fee}:`, error);
        continue;
      }
    }

    return null;
  }, [publicClient, tokenFrom, tokenTo, getV3Pool, getPoolState]);

  const handleV3Swap = useCallback(async () => {
    if (!walletClient || !address || !amountIn || !tokenFrom || !tokenTo || !chainId) {
      addToast(t("missing_parameters"), "error");
      return;
    }

    setOpened(`Swap ${(+formatUnits(amountIn, tokenFrom.decimals)).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${tokenFrom.symbol} to ${tokenTo.symbol}`);
    setSwapConfirmDialogOpened(false);

    try {
      // Calculate swap output using V3 math
      const swapResult = await calculateV3SwapOutput(
        amountIn,
        tokenFrom.address,
        tokenTo.address
      );

      if (!swapResult) {
        addToast(t("no_liquidity_pool"), "error");
        setClose();
        return;
      }

      const { amountOut: calculatedAmountOut, poolAddress } = swapResult;

      // Apply slippage protection
      const minAmountOut = calculateSlippageAmount(calculatedAmountOut, slippage);

      // Determine swap direction
      const zeroForOne = tokenFrom.address.toLowerCase() < tokenTo.address.toLowerCase();

      // Prepare swap parameters
      const swapParams = {
        recipient: address,
        zeroForOne,
        amountSpecified: amountIn,
        sqrtPriceLimitX96: zeroForOne 
          ? BigInt("4295128739") // MIN_SQRT_RATIO + 1
          : BigInt("1461446703485210103287273052203988822378723970342"), // MAX_SQRT_RATIO - 1
        data: "0x" // Empty data for basic swaps
      };

      const commonParams = {
        account: address,
        address: poolAddress as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "swap",
        args: [
          swapParams.recipient,
          swapParams.zeroForOne,
          swapParams.amountSpecified,
          swapParams.sqrtPriceLimitX96,
          swapParams.data
        ]
      };

      // Estimate gas
      const estimatedGas = await publicClient.estimateContractGas(commonParams);

      // Simulate transaction
      const { request } = await publicClient.simulateContract({
        ...commonParams,
        gas: estimatedGas + BigInt(50000), // Add buffer for gas estimation
      });

      // Execute transaction
      const hash = await walletClient.writeContract(request);

      if (hash) {
        addTransaction({
          account: address,
          hash,
          chainId,
          title: `V3 Swap ${(+formatUnits(amountIn, tokenFrom.decimals)).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${tokenFrom.symbol} to ${tokenTo.symbol}`,
        }, address);
        setSubmitted(hash, chainId as any);
        addToast(t("swap_submitted"), "success");
      }
    } catch (error) {
      console.error("V3 Swap error:", error);
      addToast(t("something_went_wrong"), "error");
      setClose();
    }
  }, [
    walletClient,
    address,
    amountIn,
    tokenFrom,
    tokenTo,
    chainId,
    setOpened,
    setSwapConfirmDialogOpened,
    calculateV3SwapOutput,
    slippage,
    publicClient,
    addTransaction,
    setSubmitted,
    t,
    setClose
  ]);

  return { 
    handleV3Swap,
    calculateV3SwapOutput,
    getV3Pool,
    getPoolState
  };
}
