import { useSwapAmountsStore, useSwapTokensStore, useTradeStore } from "@/app/[locale]/swap/stores";
import { useCallback, useEffect } from "react";
import { WrappedToken } from "@/config/types/WrappedToken";
import { parseUnits, formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { UNISWAP_V3_FACTORY_ABI } from "@/config/abis/v3-factory";
import { UNISWAP_V3_POOL_ABI } from "@/config/abis/v3-pool";
import { FeeAmount, getSqrtRatioAtTick } from "@/utils/v3-math";
import { computeSwapStep, sqrtPriceX96ToPrice } from "@/utils/v3-pool";
import { BigNumber } from "ethers";

// V3 Factory address - this would need to be deployed and configured
const V3_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984"; // Mainnet Uniswap V3 Factory

interface V3Pool {
  address: string;
  fee: FeeAmount;
  sqrtPriceX96: BigNumber;
  liquidity: BigNumber;
  tick: number;
}

interface V3Trade {
  inputAmount: {
    token: WrappedToken;
    amount: bigint;
    toSignificant: () => string;
  };
  outputAmount: {
    token: WrappedToken;
    amount: bigint;
    toSignificant: () => string;
  };
  route: {
    pools: V3Pool[];
    path: WrappedToken[];
  };
  priceImpact: number;
}

export default function useV3Trade() {
  const { trade, setTrade, tradeType, setTradeType } = useTradeStore();
  const { tokenFrom, tokenTo, setTokenTo, setTokenFrom, switchTokens } = useSwapTokensStore();
  const { amountIn, amountOut, setAmountIn, setAmountOut, amountInString, amountOutString } = useSwapAmountsStore();
  const { chainId } = useAccount();
  const publicClient = usePublicClient();

  const findBestV3Pool = useCallback(async (
    tokenA: WrappedToken,
    tokenB: WrappedToken
  ): Promise<V3Pool | null> => {
    if (!publicClient) return null;

    const feeTiers = [FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];
    let bestPool: V3Pool | null = null;
    let bestLiquidity = BigNumber.from(0);

    for (const fee of feeTiers) {
      try {
        const poolAddress = await publicClient.readContract({
          address: V3_FACTORY_ADDRESS as `0x${string}`,
          abi: UNISWAP_V3_FACTORY_ABI,
          functionName: "getPool",
          args: [tokenA.address as `0x${string}`, tokenB.address as `0x${string}`, fee]
        });

        if (poolAddress === "0x0000000000000000000000000000000000000000") continue;

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

        const liquidityBN = BigNumber.from(liquidity);
        
        if (liquidityBN.gt(bestLiquidity)) {
          bestLiquidity = liquidityBN;
          bestPool = {
            address: poolAddress,
            fee,
            sqrtPriceX96: BigNumber.from(slot0[0]),
            liquidity: liquidityBN,
            tick: slot0[1]
          };
        }
      } catch (error) {
        console.error(`Error checking pool for fee tier ${fee}:`, error);
        continue;
      }
    }

    return bestPool;
  }, [publicClient]);

  const calculateV3TradeExactIn = useCallback(async (
    amountIn: bigint,
    tokenFrom: WrappedToken,
    tokenTo: WrappedToken
  ): Promise<V3Trade | null> => {
    const pool = await findBestV3Pool(tokenFrom, tokenTo);
    if (!pool) return null;

    try {
      const zeroForOne = tokenFrom.address.toLowerCase() < tokenTo.address.toLowerCase();
      const amountInBN = BigNumber.from(amountIn.toString());

      const swapResult = computeSwapStep(
        amountInBN,
        pool.sqrtPriceX96,
        pool.liquidity,
        pool.fee,
        zeroForOne
      );

      // Calculate price impact
      const currentPrice = sqrtPriceX96ToPrice(pool.sqrtPriceX96, tokenFrom.decimals, tokenTo.decimals);
      const newPrice = sqrtPriceX96ToPrice(swapResult.sqrtPriceX96Next, tokenFrom.decimals, tokenTo.decimals);
      const priceImpact = Math.abs((newPrice - currentPrice) / currentPrice) * 100;

      return {
        inputAmount: {
          token: tokenFrom,
          amount: amountIn,
          toSignificant: () => formatUnits(amountIn, tokenFrom.decimals)
        },
        outputAmount: {
          token: tokenTo,
          amount: BigInt(swapResult.amountOut.toString()),
          toSignificant: () => formatUnits(BigInt(swapResult.amountOut.toString()), tokenTo.decimals)
        },
        route: {
          pools: [pool],
          path: [tokenFrom, tokenTo]
        },
        priceImpact
      };
    } catch (error) {
      console.error("Error calculating V3 trade:", error);
      return null;
    }
  }, [findBestV3Pool]);

  const calculateV3TradeExactOut = useCallback(async (
    amountOut: bigint,
    tokenFrom: WrappedToken,
    tokenTo: WrappedToken
  ): Promise<V3Trade | null> => {
    const pool = await findBestV3Pool(tokenFrom, tokenTo);
    if (!pool) return null;

    try {
      // For exact output, we need to work backwards from the desired output
      // This is a simplified implementation - in practice, you'd need more sophisticated math
      const zeroForOne = tokenFrom.address.toLowerCase() < tokenTo.address.toLowerCase();
      const amountOutBN = BigNumber.from(amountOut.toString());

      // Estimate input amount needed (simplified calculation)
      const currentPrice = sqrtPriceX96ToPrice(pool.sqrtPriceX96, tokenFrom.decimals, tokenTo.decimals);
      const estimatedAmountIn = zeroForOne 
        ? amountOutBN.div(BigNumber.from(Math.floor(currentPrice * 1000000)).div(1000000))
        : amountOutBN.mul(BigNumber.from(Math.floor(currentPrice * 1000000)).div(1000000));

      // Add fee
      const feeMultiplier = BigNumber.from(1000000).add(pool.fee);
      const amountInWithFee = estimatedAmountIn.mul(feeMultiplier).div(1000000);

      return {
        inputAmount: {
          token: tokenFrom,
          amount: BigInt(amountInWithFee.toString()),
          toSignificant: () => formatUnits(BigInt(amountInWithFee.toString()), tokenFrom.decimals)
        },
        outputAmount: {
          token: tokenTo,
          amount: amountOut,
          toSignificant: () => formatUnits(amountOut, tokenTo.decimals)
        },
        route: {
          pools: [pool],
          path: [tokenFrom, tokenTo]
        },
        priceImpact: 0 // Simplified - would need proper calculation
      };
    } catch (error) {
      console.error("Error calculating V3 trade exact out:", error);
      return null;
    }
  }, [findBestV3Pool]);

  const handleAmountInChange = useCallback(async (amountInParam: string) => {
    setAmountIn(amountInParam, tokenFrom?.decimals);
    setTradeType("EXACT_INPUT" as any);

    if (!amountInParam || !tokenFrom || !tokenTo) {
      setAmountOut("");
      setTrade(null);
      return;
    }

    try {
      const parsedAmountIn = parseUnits(amountInParam, tokenFrom.decimals);
      const v3Trade = await calculateV3TradeExactIn(parsedAmountIn, tokenFrom, tokenTo);

      if (v3Trade) {
        setTrade(v3Trade as any);
        setAmountOut(v3Trade.outputAmount.toSignificant(), tokenTo.decimals);
      } else {
        setTrade(null);
        setAmountOut("");
      }
    } catch (error) {
      console.error("Error in handleAmountInChange:", error);
      setTrade(null);
      setAmountOut("");
    }
  }, [calculateV3TradeExactIn, setAmountIn, setAmountOut, setTrade, setTradeType, tokenFrom, tokenTo]);

  const handleAmountOutChange = useCallback(async (amountOutParam: string) => {
    setAmountOut(amountOutParam, tokenTo?.decimals);
    setTradeType("EXACT_OUTPUT" as any);

    if (!amountOutParam || !tokenFrom || !tokenTo) {
      setAmountIn("");
      setTrade(null);
      return;
    }

    try {
      const parsedAmountOut = parseUnits(amountOutParam, tokenTo.decimals);
      const v3Trade = await calculateV3TradeExactOut(parsedAmountOut, tokenFrom, tokenTo);

      if (v3Trade) {
        setTrade(v3Trade as any);
        setAmountIn(v3Trade.inputAmount.toSignificant(), tokenFrom.decimals);
      } else {
        setTrade(null);
        setAmountIn("");
      }
    } catch (error) {
      console.error("Error in handleAmountOutChange:", error);
      setTrade(null);
      setAmountIn("");
    }
  }, [calculateV3TradeExactOut, setAmountIn, setAmountOut, setTrade, setTradeType, tokenFrom, tokenTo]);

  const handleTokenFromChange = useCallback(async (tokenFromParam: WrappedToken) => {
    let currentTokenTo = tokenTo;

    if (tokenTo && tokenFromParam.address === tokenTo.address) {
      currentTokenTo = tokenFrom;
      setTokenTo(tokenFrom);
    }

    setTokenFrom(tokenFromParam);

    if (amountInString) {
      setAmountIn(amountInString, tokenFromParam.decimals);
    }

    // Recalculate trade with new token
    if (currentTokenTo && amountInString) {
      await handleAmountInChange(amountInString);
    }
  }, [tokenFrom, tokenTo, amountInString, setTokenFrom, setTokenTo, setAmountIn, handleAmountInChange]);

  const handleTokenToChange = useCallback(async (tokenToParam: WrappedToken) => {
    let currentTokenFrom = tokenFrom;

    if (tokenFrom && tokenToParam.address === tokenFrom.address) {
      currentTokenFrom = tokenTo;
      setTokenFrom(tokenTo);
    }

    setTokenTo(tokenToParam);

    if (amountOutString) {
      setAmountOut(amountOutString, tokenToParam.decimals);
    }

    // Recalculate trade with new token
    if (currentTokenFrom && amountInString) {
      await handleAmountInChange(amountInString);
    }
  }, [tokenFrom, tokenTo, amountInString, amountOutString, setTokenFrom, setTokenTo, setAmountOut, handleAmountInChange]);

  const handleSwitch = useCallback(async () => {
    switchTokens();
    setAmountIn(amountOutString, tokenTo?.decimals);

    if (tokenTo && tokenFrom && amountOutString) {
      await handleAmountInChange(amountOutString);
    }
  }, [amountOutString, switchTokens, setAmountIn, tokenFrom, tokenTo, handleAmountInChange]);

  return {
    trade,
    handleAmountInChange,
    handleAmountOutChange,
    handleTokenFromChange,
    handleTokenToChange,
    handleSwitch,
    findBestV3Pool
  };
}
