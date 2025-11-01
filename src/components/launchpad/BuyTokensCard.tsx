// Buy Tokens Card Component

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import LaunchpadABI from '@/config/abis/Launchpad.json';
import ERC20ABI from '@/config/abis/ERC20.json';
import { LAUNCHPAD_PROXY_ADDRESS, getPaymentTokenSymbol } from '@/lib/launchpad/contracts';
import type { IIcoInfo, IcoStatus } from '@/lib/launchpad/types';
import { getEvmCostInfo } from '@/lib/launchpad/ico';
import { Loader2, ShoppingCart } from 'lucide-react';

interface BuyTokensCardProps {
  ico: IIcoInfo;
  status: IcoStatus;
  currentPrice: number;
  onPurchaseSuccess?: () => void;
}

export function BuyTokensCard({ ico, status, currentPrice, onPurchaseSuccess }: BuyTokensCardProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState<string>('');
  const [isApproving, setIsApproving] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const isNativePayment = ico.costMint === '0x0000000000000000000000000000000000000000';
  const paymentSymbol = getPaymentTokenSymbol(ico.costMint);

  // Calculate cost
  const [cost, setCost] = useState<{ value: bigint; availableAmount: bigint } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const calculateCost = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setCost(null);
        return;
      }

      try {
        setIsCalculating(true);
        const amountBigInt = parseUnits(amount, Math.log10(ico.icoDecimals));
        const result = await getEvmCostInfo(ico.seed, amountBigInt);
        setCost(result);
      } catch (error) {
        console.error('Failed to calculate cost:', error);
        setCost(null);
      } finally {
        setIsCalculating(false);
      }
    };

    const debounce = setTimeout(calculateCost, 500);
    return () => clearTimeout(debounce);
  }, [amount, ico.seed, ico.icoDecimals]);

  // Check allowance for ERC20 payment tokens
  const { data: allowance } = useReadContract({
    address: isNativePayment ? undefined : (ico.costMint as `0x${string}`),
    abi: ERC20ABI,
    functionName: 'allowance',
    args: address && !isNativePayment ? [address, LAUNCHPAD_PROXY_ADDRESS] : undefined,
    query: {
      enabled: !!address && !isNativePayment,
    },
  });

  const needsApproval = useMemo(() => {
    if (isNativePayment || !cost || !allowance) return false;
    return (allowance as bigint) < cost.value;
  }, [isNativePayment, cost, allowance]);

  // Approve ERC20 token
  const { writeContract: approveToken } = useWriteContract();

  const handleApprove = async () => {
    if (!cost || isNativePayment) return;

    setIsApproving(true);
    try {
      await approveToken({
        address: ico.costMint as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [LAUNCHPAD_PROXY_ADDRESS, cost.value],
      });
      toast.success('Approval submitted');
    } catch (error: any) {
      console.error('Approval failed:', error);
      toast.error(error.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  // Buy tokens
  const { writeContract: buyTokens, data: purchaseHash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: purchaseHash,
  });

  const handlePurchase = async () => {
    if (!cost || !amount) return;

    setIsPurchasing(true);
    try {
      const amountBigInt = parseUnits(amount, Math.log10(ico.icoDecimals));
      
      await buyTokens({
        address: LAUNCHPAD_PROXY_ADDRESS as `0x${string}`,
        abi: LaunchpadABI,
        functionName: 'buy',
        args: [ico.seed, amountBigInt],
        value: isNativePayment ? cost.value : 0n,
      });

      toast.success('Purchase submitted');
      setAmount('');
      onPurchaseSuccess?.();
    } catch (error: any) {
      console.error('Purchase failed:', error);
      toast.error(error.message || 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const canPurchase = status === 'Live' && !!address && !!cost && !needsApproval;
  const isDisabled = status !== 'Live' || !address;

  // Calculate bonus
  const bonusAmount = useMemo(() => {
    if (!cost || !ico.bonusPercentage || ico.bonusReserve === 0) return 0;
    
    const purchaseAmount = Number(cost.availableAmount) / ico.icoDecimals;
    const bonus = purchaseAmount * (ico.bonusPercentage / 10000);
    const maxBonus = ico.bonusReserve / ico.icoDecimals;
    
    return Math.min(bonus, maxBonus);
  }, [cost, ico]);

  const totalTokens = useMemo(() => {
    if (!cost) return 0;
    return Number(cost.availableAmount) / ico.icoDecimals + bonusAmount;
  }, [cost, bonusAmount, ico.icoDecimals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Buy Tokens
        </CardTitle>
        <CardDescription>
          Current price: {currentPrice.toFixed(6)} {paymentSymbol}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!address ? (
          <div className="text-center py-8 text-muted-foreground">
            Please connect your wallet to purchase tokens
          </div>
        ) : status !== 'Live' ? (
          <div className="text-center py-8 text-muted-foreground">
            This ICO is not currently active
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Purchase</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={1 / ico.icoDecimals}
                step={1 / ico.icoDecimals}
              />
            </div>

            {isCalculating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating cost...
              </div>
            )}

            {cost && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Cost:</span>
                  <span className="font-semibold">
                    {formatUnits(cost.value, isNativePayment ? 18 : 6)} {paymentSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tokens:</span>
                  <span className="font-semibold">
                    {(Number(cost.availableAmount) / ico.icoDecimals).toLocaleString()}
                  </span>
                </div>
                {bonusAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Bonus:</span>
                    <span className="font-semibold">+{bonusAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{totalTokens.toLocaleString()} tokens</span>
                </div>
              </div>
            )}

            {needsApproval && (
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full"
                variant="outline"
              >
                {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve {paymentSymbol}
              </Button>
            )}

            <Button
              onClick={handlePurchase}
              disabled={!canPurchase || isPurchasing || isConfirming}
              className="w-full"
            >
              {(isPurchasing || isConfirming) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPurchasing || isConfirming ? 'Processing...' : 'Buy Tokens'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
