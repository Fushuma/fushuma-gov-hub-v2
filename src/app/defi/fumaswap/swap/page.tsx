import { SwapWidget } from '@/components/defi/SwapWidget';

export const metadata = {
  title: 'Swap | Fushuma DeFi',
  description: 'Swap tokens on Fushuma Network with the best rates powered by FumaSwap V4',
};

export default function FumaSwapPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Swap Tokens</h1>
          <p className="text-muted-foreground text-lg">
            Trade any token on Fushuma Network with concentrated liquidity and low fees
          </p>
        </div>
        
        {/* Swap Widget */}
        <SwapWidget />
        
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="font-semibold">Low Fees</h3>
            <p className="text-sm text-muted-foreground">
              Optimized gas costs with FumaSwap V4 Singleton architecture
            </p>
          </div>
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="font-semibold">Best Rates</h3>
            <p className="text-sm text-muted-foreground">
              Concentrated liquidity ensures optimal pricing for your trades
            </p>
          </div>
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">🎁</span>
            </div>
            <h3 className="font-semibold">FUMA Benefits</h3>
            <p className="text-sm text-muted-foreground">
              Hold FUMA tokens to get up to 50% discount on swap fees
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

