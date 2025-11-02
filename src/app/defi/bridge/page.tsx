import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Bridge | Fushuma',
  description: 'Cross-chain token bridge for seamless asset transfers'
};

export default function BridgePage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-12 py-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Cross-Chain Bridge
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Transfer tokens seamlessly between different blockchain networks with security and speed
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/defi/bridge/swap">
              Start Bridging
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/defi/bridge/claim">
              Claim Tokens
            </Link>
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Zap className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Fast Transfers</CardTitle>
            <CardDescription>
              Quick and efficient cross-chain transfers with minimal wait times
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Secure Bridge</CardTitle>
            <CardDescription>
              Multi-signature validation ensures the security of your assets
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Globe className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Multi-Chain Support</CardTitle>
            <CardDescription>
              Bridge tokens across multiple blockchain networks seamlessly
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Supported Networks */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Networks</CardTitle>
          <CardDescription>
            Bridge tokens across these blockchain networks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: 'Ethereum', symbol: 'ETH' },
              { name: 'BNB Chain', symbol: 'BNB' },
              { name: 'Polygon', symbol: 'MATIC' },
              { name: 'Fushuma', symbol: 'FUMA' },
              { name: 'Arbitrum', symbol: 'ARB' },
              { name: 'Base', symbol: 'BASE' },
              { name: 'Callisto', symbol: 'CLO' },
              { name: 'Huobi ECO', symbol: 'HT' }
            ].map((network) => (
              <div
                key={network.symbol}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-sm font-semibold">{network.symbol.substring(0, 2)}</span>
                </div>
                <div>
                  <p className="font-medium">{network.name}</p>
                  <p className="text-xs text-muted-foreground">{network.symbol}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How to Use */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use the Bridge</CardTitle>
          <CardDescription>
            Follow these simple steps to bridge your tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              <div>
                <h4 className="mb-1 font-semibold">Connect Your Wallet</h4>
                <p className="text-sm text-muted-foreground">
                  Connect your Web3 wallet to get started with bridging
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <div>
                <h4 className="mb-1 font-semibold">Select Networks and Token</h4>
                <p className="text-sm text-muted-foreground">
                  Choose source and destination networks, then select the token to bridge
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
              <div>
                <h4 className="mb-1 font-semibold">Initiate Bridge Transaction</h4>
                <p className="text-sm text-muted-foreground">
                  Enter amount, approve if needed, and confirm the bridge transaction
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                4
              </div>
              <div>
                <h4 className="mb-1 font-semibold">Wait for Confirmations</h4>
                <p className="text-sm text-muted-foreground">
                  Wait for the required block confirmations on the source chain
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                5
              </div>
              <div>
                <h4 className="mb-1 font-semibold">Claim on Destination Chain</h4>
                <p className="text-sm text-muted-foreground">
                  Switch to destination network and claim your bridged tokens
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="rounded-lg border bg-muted/50 p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold">Ready to Bridge?</h2>
        <p className="mb-6 text-muted-foreground">
          Start transferring your tokens across chains now
        </p>
        <Button size="lg" asChild>
          <Link href="/defi/bridge/swap">
            Bridge Tokens
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
