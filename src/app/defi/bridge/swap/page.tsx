import { Metadata } from 'next';
import { BridgeForm } from '@/components/bridge/BridgeForm';
import { TransactionHistory } from '@/components/bridge/TransactionHistory';

export const metadata: Metadata = {
  title: 'Bridge - Swap Tokens | Fushuma',
  description: 'Bridge tokens between different blockchain networks'
};

export default function BridgeSwapPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bridge Tokens</h1>
        <p className="mt-2 text-muted-foreground">
          Transfer tokens seamlessly between different blockchain networks
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <BridgeForm />
        </div>
        <div>
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">How It Works</h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    1
                  </span>
                  <span>Select the source and destination networks</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    2
                  </span>
                  <span>Choose the token you want to bridge</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    3
                  </span>
                  <span>Enter the amount and approve if needed</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    4
                  </span>
                  <span>Confirm the bridge transaction</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    5
                  </span>
                  <span>Wait for confirmations, then claim on the destination chain</span>
                </li>
              </ol>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Bridge Fees</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Bridge Fee:</span>
                  <span className="font-medium text-foreground">0%</span>
                </div>
                <div className="flex justify-between">
                  <span>Gas Fee:</span>
                  <span className="font-medium text-foreground">Network dependent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TransactionHistory />
    </div>
  );
}
