import { Metadata } from 'next';
import { ClaimForm } from '@/components/bridge/ClaimForm';
import { TransactionHistory } from '@/components/bridge/TransactionHistory';

export const metadata: Metadata = {
  title: 'Bridge - Claim Tokens | Fushuma',
  description: 'Claim your bridged tokens on the destination chain'
};

export default function BridgeClaimPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Claim Bridged Tokens</h1>
        <p className="mt-2 text-muted-foreground">
          Claim your tokens on the destination chain after bridging
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <ClaimForm />
        </div>
        <div>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Claiming Process</h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                After initiating a bridge transaction, you need to wait for the required number of
                block confirmations on the source chain. Once confirmed, you can claim your tokens
                on the destination chain.
              </p>
              <p>
                The claim process requires signatures from bridge validators to ensure security.
                These signatures are automatically fetched when you submit the claim.
              </p>
              <div className="mt-4 rounded-lg bg-muted/50 p-4">
                <p className="mb-2 font-medium text-foreground">Required Confirmations:</p>
                <ul className="space-y-1">
                  <li>Ethereum: 6 blocks (~1-2 minutes)</li>
                  <li>BSC: 5 blocks (~15 seconds)</li>
                  <li>Polygon: 302 blocks (~10 minutes)</li>
                  <li>Fushuma: 66 blocks (~3 minutes)</li>
                  <li>Arbitrum: 1202 blocks (~5 minutes)</li>
                  <li>Base: 302 blocks (~10 minutes)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TransactionHistory />
    </div>
  );
}
