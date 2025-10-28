import { PoolBrowser } from '@/components/defi/PoolBrowser';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Pools | Fushuma DeFi',
  description: 'Browse and manage liquidity pools on Fushuma Network',
};

export default function PoolsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Liquidity Pools</h1>
            <p className="text-muted-foreground text-lg">
              Explore all active pools on Fushuma Network
            </p>
          </div>
          
          <Link href="/defi/pancakeswap/liquidity">
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Position
            </Button>
          </Link>
        </div>
        
        {/* Pool Browser */}
        <PoolBrowser />
      </div>
    </div>
  );
}

