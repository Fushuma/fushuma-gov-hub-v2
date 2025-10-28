import { AddLiquidity } from '@/components/defi/AddLiquidity';

export const metadata = {
  title: 'Add Liquidity | Fushuma DeFi',
  description: 'Provide liquidity to earn trading fees on Fushuma Network',
};

export default function LiquidityPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Add Liquidity</h1>
          <p className="text-muted-foreground text-lg">
            Earn fees by providing liquidity to trading pairs
          </p>
        </div>
        
        {/* Add Liquidity Component */}
        <AddLiquidity />
        
        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <div className="rounded-lg border p-6 space-y-3">
            <h3 className="font-semibold text-lg">💰 Earn Trading Fees</h3>
            <p className="text-sm text-muted-foreground">
              Liquidity providers earn a portion of all trading fees from swaps in their pool. 
              The more volume your pool has, the more fees you earn.
            </p>
          </div>
          
          <div className="rounded-lg border p-6 space-y-3">
            <h3 className="font-semibold text-lg">🎯 Concentrated Liquidity</h3>
            <p className="text-sm text-muted-foreground">
              With PancakeSwap V4, you can concentrate your liquidity in specific price ranges 
              for up to 4000x capital efficiency compared to traditional AMMs.
            </p>
          </div>
          
          <div className="rounded-lg border p-6 space-y-3">
            <h3 className="font-semibold text-lg">🔒 NFT Positions</h3>
            <p className="text-sm text-muted-foreground">
              Your liquidity position is represented as an NFT, which you can transfer, 
              trade, or use as collateral in other DeFi protocols.
            </p>
          </div>
          
          <div className="rounded-lg border p-6 space-y-3">
            <h3 className="font-semibold text-lg">⚠️ Impermanent Loss</h3>
            <p className="text-sm text-muted-foreground">
              Be aware that providing liquidity exposes you to impermanent loss if token 
              prices diverge. Concentrated positions have higher impermanent loss risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

