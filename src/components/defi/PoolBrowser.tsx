'use client';

import { useState } from 'react';
import { Search, TrendingUp, Droplet, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatFee } from '@/lib/fumaswap/pools';
import { FeeAmount } from '@/lib/fumaswap/contracts';

// Mock pool data - will be replaced with actual data from contracts
const MOCK_POOLS = [
  {
    id: '1',
    token0: { symbol: 'FUMA', name: 'Fushuma Token' },
    token1: { symbol: 'USDC', name: 'USD Coin' },
    fee: FeeAmount.MEDIUM,
    tvl: 1250000,
    volume24h: 85000,
    apr: 15.5,
    liquidity: 1250000,
  },
  {
    id: '2',
    token0: { symbol: 'FUMA', name: 'Fushuma Token' },
    token1: { symbol: 'WETH', name: 'Wrapped Ether' },
    fee: FeeAmount.MEDIUM,
    tvl: 850000,
    volume24h: 125000,
    apr: 22.3,
    liquidity: 850000,
  },
  {
    id: '3',
    token0: { symbol: 'USDC', name: 'USD Coin' },
    token1: { symbol: 'USDT', name: 'Tether USD' },
    fee: FeeAmount.LOWEST,
    tvl: 2100000,
    volume24h: 450000,
    apr: 8.2,
    liquidity: 2100000,
  },
  {
    id: '4',
    token0: { symbol: 'WETH', name: 'Wrapped Ether' },
    token1: { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
    fee: FeeAmount.LOW,
    tvl: 3500000,
    volume24h: 680000,
    apr: 18.7,
    liquidity: 3500000,
  },
];

export function PoolBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'tvl' | 'volume' | 'apr'>('tvl');
  
  const filteredPools = MOCK_POOLS.filter((pool) => {
    const query = searchQuery.toLowerCase();
    return (
      pool.token0.symbol.toLowerCase().includes(query) ||
      pool.token1.symbol.toLowerCase().includes(query) ||
      pool.token0.name.toLowerCase().includes(query) ||
      pool.token1.name.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    switch (sortBy) {
      case 'tvl':
        return b.tvl - a.tvl;
      case 'volume':
        return b.volume24h - a.volume24h;
      case 'apr':
        return b.apr - a.apr;
      default:
        return 0;
    }
  });
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Liquidity Pools</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => setSortBy('tvl')}
                >
                  <div className="flex items-center gap-1">
                    TVL
                    {sortBy === 'tvl' && <TrendingUp className="h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => setSortBy('volume')}
                >
                  <div className="flex items-center gap-1">
                    Volume (24h)
                    {sortBy === 'volume' && <TrendingUp className="h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => setSortBy('apr')}
                >
                  <div className="flex items-center gap-1">
                    APR
                    {sortBy === 'apr' && <TrendingUp className="h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No pools found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPools.map((pool) => (
                  <TableRow key={pool.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold">
                            {pool.token0.symbol[0]}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-secondary/20 border-2 border-background flex items-center justify-center text-xs font-bold">
                            {pool.token1.symbol[0]}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">
                            {pool.token0.symbol}/{pool.token1.symbol}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pool.token0.name} / {pool.token1.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatFee(pool.fee)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Droplet className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{formatCurrency(pool.tvl)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(pool.volume24h)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {pool.apr.toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm">
                          Add Liquidity
                        </Button>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total TVL</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(MOCK_POOLS.reduce((sum, pool) => sum + pool.tvl, 0))}
                  </p>
                </div>
                <Droplet className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">24h Volume</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(MOCK_POOLS.reduce((sum, pool) => sum + pool.volume24h, 0))}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Pools</p>
                  <p className="text-2xl font-bold mt-1">{MOCK_POOLS.length}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold">{MOCK_POOLS.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

