import {
  useSwapAmountsStore,
  useSwapTokensStore,
  useTradeStore,
  useTransactionSettingsStore
} from "@/app/[locale]/swap/stores";
import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { formatUnits } from "viem";
import { useRecentTransactionsStore } from "@/stores/useRecentTransactions";
import { useAwaitingDialogStore } from "@/stores/useAwaitingDialogStore";
import { useConfirmSwapDialogStore } from "@/app/[locale]/swap/stores/confirm";
import addToast from "@/other/toast";
import { useTranslations } from "use-intl";
import useV3Swap from "./useV3Swap";
import useSwap from "./useSwap";

export type SwapVersion = "V2" | "V3" | "AUTO";

export default function useEnhancedSwap() {
  const t = useTranslations("Toast");
  const [swapVersion, setSwapVersion] = useState<SwapVersion>("AUTO");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { tokenTo, tokenFrom } = useSwapTokensStore();
  const { amountIn, amountOut } = useSwapAmountsStore();
  const { trade } = useTradeStore();

  // Import both V2 and V3 swap hooks
  const { handleSwap: handleV2Swap } = useSwap();
  const { 
    handleV3Swap, 
    calculateV3SwapOutput, 
    getV3Pool 
  } = useV3Swap();

  const analyzeOptimalRoute = useCallback(async () => {
    if (!tokenFrom || !tokenTo || !amountIn) {
      return "V2"; // Default to V2 if insufficient data
    }

    setIsAnalyzing(true);

    try {
      // Check if V3 pool exists and has liquidity
      const v3Result = await calculateV3SwapOutput(
        amountIn,
        tokenFrom.address,
        tokenTo.address
      );

      if (v3Result && v3Result.amountOut > 0n) {
        // Compare with V2 trade if available
        if (trade && trade.outputAmount) {
          const v2AmountOut = BigInt(trade.outputAmount.raw.toString());
          const v3AmountOut = v3Result.amountOut;

          // Choose V3 if it gives better output (accounting for gas costs)
          const v3Advantage = Number(v3AmountOut - v2AmountOut) / Number(v2AmountOut);
          
          // Use V3 if it provides at least 0.1% better rate
          if (v3Advantage > 0.001) {
            return "V3";
          }
        } else {
          // No V2 trade available, use V3 if it exists
          return "V3";
        }
      }

      // Default to V2
      return "V2";
    } catch (error) {
      console.error("Error analyzing optimal route:", error);
      return "V2";
    } finally {
      setIsAnalyzing(false);
    }
  }, [tokenFrom, tokenTo, amountIn, trade, calculateV3SwapOutput]);

  const handleEnhancedSwap = useCallback(async () => {
    if (!tokenFrom || !tokenTo || !amountIn) {
      addToast(t("missing_parameters"), "error");
      return;
    }

    let versionToUse = swapVersion;

    // Auto-select best version if set to AUTO
    if (swapVersion === "AUTO") {
      versionToUse = await analyzeOptimalRoute();
      addToast(
        t("using_version", { version: versionToUse }), 
        "info"
      );
    }

    // Execute swap based on selected version
    if (versionToUse === "V3") {
      await handleV3Swap();
    } else {
      await handleV2Swap();
    }
  }, [
    tokenFrom,
    tokenTo,
    amountIn,
    swapVersion,
    analyzeOptimalRoute,
    handleV3Swap,
    handleV2Swap,
    t
  ]);

  const getSwapInfo = useCallback(async () => {
    if (!tokenFrom || !tokenTo || !amountIn) {
      return null;
    }

    const info = {
      v2Available: !!trade,
      v3Available: false,
      v2Output: trade ? BigInt(trade.outputAmount.raw.toString()) : 0n,
      v3Output: 0n,
      recommendedVersion: "V2" as SwapVersion,
      priceImpact: {
        v2: trade?.priceImpact?.toSignificant(2) || "0",
        v3: "0"
      }
    };

    try {
      const v3Result = await calculateV3SwapOutput(
        amountIn,
        tokenFrom.address,
        tokenTo.address
      );

      if (v3Result) {
        info.v3Available = true;
        info.v3Output = v3Result.amountOut;

        // Determine recommended version
        if (info.v2Available && info.v3Available) {
          const v3Advantage = Number(info.v3Output - info.v2Output) / Number(info.v2Output);
          info.recommendedVersion = v3Advantage > 0.001 ? "V3" : "V2";
        } else if (info.v3Available) {
          info.recommendedVersion = "V3";
        }
      }
    } catch (error) {
      console.error("Error getting V3 swap info:", error);
    }

    return info;
  }, [tokenFrom, tokenTo, amountIn, trade, calculateV3SwapOutput]);

  const switchToVersion = useCallback((version: SwapVersion) => {
    setSwapVersion(version);
    addToast(
      t("switched_to_version", { version }), 
      "info"
    );
  }, [t]);

  return {
    handleEnhancedSwap,
    swapVersion,
    setSwapVersion: switchToVersion,
    analyzeOptimalRoute,
    getSwapInfo,
    isAnalyzing,
    // Expose individual handlers for manual selection
    handleV2Swap,
    handleV3Swap
  };
}
