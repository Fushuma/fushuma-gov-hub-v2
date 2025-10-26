import { useSwapAmountsStore, useSwapTokensStore, useTradeStore } from "@/app/[locale]/swap/stores";
import { useCallback, useState, useEffect } from "react";
import { TokenAmount, Trade, TradeType } from "@callisto-enterprise/soy-sdk";
import { WrappedToken } from "@/config/types/WrappedToken";
import { parseUnits } from "viem";
import getAllowedPairs from "@/app/[locale]/swap/hooks/useAllowedPairs";
import { useAccount } from "wagmi";
import useV3Trade from "./useV3Trade";
import useTrade from "./useTrade";

export type TradeVersion = "V2" | "V3" | "BEST";

export default function useEnhancedTrade() {
  const [tradeVersion, setTradeVersion] = useState<TradeVersion>("BEST");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { trade, setTrade, tradeType, setTradeType } = useTradeStore();
  const { tokenFrom, tokenTo, setTokenTo, setTokenFrom, switchTokens } = useSwapTokensStore();
  const { amountIn, amountOut, setAmountIn, setAmountOut, amountInString, amountOutString } = useSwapAmountsStore();
  const { chainId } = useAccount();

  // Import both V2 and V3 trade hooks
  const v2Trade = useTrade();
  const v3Trade = useV3Trade();

  const [v2TradeData, setV2TradeData] = useState<any>(null);
  const [v3TradeData, setV3TradeData] = useState<any>(null);

  const compareTrades = useCallback((v2Trade: any, v3Trade: any) => {
    if (!v2Trade && !v3Trade) return null;
    if (!v2Trade) return { better: "V3", trade: v3Trade };
    if (!v3Trade) return { better: "V2", trade: v2Trade };

    // Compare output amounts
    const v2Output = BigInt(v2Trade.outputAmount.raw.toString());
    const v3Output = BigInt(v3Trade.outputAmount.amount.toString());

    if (v3Output > v2Output) {
      const improvement = Number(v3Output - v2Output) / Number(v2Output);
      return { 
        better: "V3", 
        trade: v3Trade, 
        improvement: improvement * 100 
      };
    } else {
      const improvement = Number(v2Output - v3Output) / Number(v3Output);
      return { 
        better: "V2", 
        trade: v2Trade, 
        improvement: improvement * 100 
      };
    }
  }, []);

  const selectBestTrade = useCallback(async () => {
    if (tradeVersion === "BEST") {
      setIsAnalyzing(true);
      
      try {
        // Get both V2 and V3 trades
        const comparison = compareTrades(v2TradeData, v3TradeData);
        
        if (comparison) {
          setTrade(comparison.trade);
          return comparison;
        }
      } catch (error) {
        console.error("Error selecting best trade:", error);
      } finally {
        setIsAnalyzing(false);
      }
    } else if (tradeVersion === "V2") {
      setTrade(v2TradeData);
    } else if (tradeVersion === "V3") {
      setTrade(v3TradeData);
    }

    return null;
  }, [tradeVersion, v2TradeData, v3TradeData, setTrade, compareTrades]);

  const handleAmountInChange = useCallback(async (amountInParam: string) => {
    setAmountIn(amountInParam, tokenFrom?.decimals);
    setTradeType(TradeType.EXACT_INPUT);

    if (!amountInParam || !tokenFrom || !tokenTo) {
      setAmountOut("");
      setTrade(null);
      setV2TradeData(null);
      setV3TradeData(null);
      return;
    }

    // Get V2 trade
    try {
      await v2Trade.handleAmountInChange(amountInParam);
      setV2TradeData(trade);
    } catch (error) {
      console.error("V2 trade error:", error);
      setV2TradeData(null);
    }

    // Get V3 trade
    try {
      await v3Trade.handleAmountInChange(amountInParam);
      setV3TradeData(v3Trade.trade);
    } catch (error) {
      console.error("V3 trade error:", error);
      setV3TradeData(null);
    }

    // Select best trade
    await selectBestTrade();
  }, [
    setAmountIn,
    setAmountOut,
    setTrade,
    setTradeType,
    tokenFrom,
    tokenTo,
    v2Trade,
    v3Trade,
    trade,
    selectBestTrade
  ]);

  const handleAmountOutChange = useCallback(async (amountOutParam: string) => {
    setAmountOut(amountOutParam, tokenTo?.decimals);
    setTradeType(TradeType.EXACT_OUTPUT);

    if (!amountOutParam || !tokenFrom || !tokenTo) {
      setAmountIn("");
      setTrade(null);
      setV2TradeData(null);
      setV3TradeData(null);
      return;
    }

    // Get V2 trade
    try {
      await v2Trade.handleAmountOutChange(amountOutParam);
      setV2TradeData(trade);
    } catch (error) {
      console.error("V2 trade error:", error);
      setV2TradeData(null);
    }

    // Get V3 trade
    try {
      await v3Trade.handleAmountOutChange(amountOutParam);
      setV3TradeData(v3Trade.trade);
    } catch (error) {
      console.error("V3 trade error:", error);
      setV3TradeData(null);
    }

    // Select best trade
    await selectBestTrade();
  }, [
    setAmountIn,
    setAmountOut,
    setTrade,
    setTradeType,
    tokenFrom,
    tokenTo,
    v2Trade,
    v3Trade,
    trade,
    selectBestTrade
  ]);

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

    // Update both V2 and V3 trades
    if (currentTokenTo) {
      await v2Trade.handleTokenFromChange(tokenFromParam);
      await v3Trade.handleTokenFromChange(tokenFromParam);
      await selectBestTrade();
    }
  }, [
    tokenFrom,
    tokenTo,
    amountInString,
    setTokenFrom,
    setTokenTo,
    setAmountIn,
    v2Trade,
    v3Trade,
    selectBestTrade
  ]);

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

    // Update both V2 and V3 trades
    if (currentTokenFrom) {
      await v2Trade.handleTokenToChange(tokenToParam);
      await v3Trade.handleTokenToChange(tokenToParam);
      await selectBestTrade();
    }
  }, [
    tokenFrom,
    tokenTo,
    amountOutString,
    setTokenFrom,
    setTokenTo,
    setAmountOut,
    v2Trade,
    v3Trade,
    selectBestTrade
  ]);

  const handleSwitch = useCallback(async () => {
    switchTokens();
    setAmountIn(amountOutString, tokenTo?.decimals);

    // Update both V2 and V3 trades
    await v2Trade.handleSwitch();
    await v3Trade.handleSwitch();
    await selectBestTrade();
  }, [
    amountOutString,
    switchTokens,
    setAmountIn,
    tokenTo,
    v2Trade,
    v3Trade,
    selectBestTrade
  ]);

  const getTradeComparison = useCallback(() => {
    return {
      v2Available: !!v2TradeData,
      v3Available: !!v3TradeData,
      v2Output: v2TradeData ? BigInt(v2TradeData.outputAmount.raw.toString()) : 0n,
      v3Output: v3TradeData ? BigInt(v3TradeData.outputAmount.amount.toString()) : 0n,
      currentVersion: tradeVersion,
      bestVersion: compareTrades(v2TradeData, v3TradeData)?.better || "V2",
      improvement: compareTrades(v2TradeData, v3TradeData)?.improvement || 0
    };
  }, [v2TradeData, v3TradeData, tradeVersion, compareTrades]);

  return {
    trade,
    handleAmountInChange,
    handleAmountOutChange,
    handleTokenFromChange,
    handleTokenToChange,
    handleSwitch,
    tradeVersion,
    setTradeVersion,
    getTradeComparison,
    isAnalyzing,
    v2TradeData,
    v3TradeData
  };
}
