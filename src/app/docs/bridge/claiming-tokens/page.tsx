import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Claim Tokens | Fushuma Docs',
  description: 'Learn how to claim your bridged tokens on the destination chain.',
};

export default function ClaimingTokensPage() {
  return (
    <article>
      <h1>How to Claim Tokens</h1>
      <p className="lead">
        After bridging tokens to another network, you need to claim them on the destination chain. This guide explains the claiming process.
      </p>

      <h2>Understanding the Claim Process</h2>
      <p>
        When you bridge tokens, the process happens in two stages:
      </p>
      <ol>
        <li><strong>Transfer Stage</strong> - Your tokens are locked on the source chain and validators verify the transaction</li>
        <li><strong>Claim Stage</strong> - You execute a transaction on the destination chain to receive your tokens</li>
      </ol>
      <p>
        The claim stage is necessary because the bridge cannot automatically send tokens to your wallet on the destination chain. You must initiate the claim transaction yourself.
      </p>

      <h2>When Can I Claim?</h2>
      <p>
        Your tokens are ready to claim once:
      </p>
      <ul>
        <li>The transfer transaction is confirmed on the source chain</li>
        <li>The required number of block confirmations has passed</li>
        <li>The validator network has signed off on the transfer</li>
      </ul>
      <p>
        This typically takes 5-15 minutes, but can vary depending on network congestion and the specific chains involved.
      </p>

      <h2>Step 1: Navigate to the Claim Page</h2>
      <p>
        Go to the <a href="/defi/bridge/claim">Claim page</a> in the Bridge section. This page shows all your pending claims across different networks.
      </p>

      <h2>Step 2: Connect to the Destination Network</h2>
      <p>
        Make sure your wallet is connected to the destination network where you want to claim your tokens. If you're on the wrong network, the interface will prompt you to switch networks.
      </p>
      <div className="bg-accent/50 border border-border rounded-lg p-4 my-4">
        <p className="text-sm mb-0">
          <strong>💡 Tip:</strong> Click the "Switch Network" button to automatically switch your wallet to the correct network.
        </p>
      </div>

      <h2>Step 3: Review Pending Claims</h2>
      <p>
        The claim page displays all your bridge transactions that are ready to claim. For each transaction, you'll see:
      </p>
      <ul>
        <li>Source network and token</li>
        <li>Destination network and token</li>
        <li>Amount to claim</li>
        <li>Transaction status</li>
        <li>Estimated gas cost for claiming</li>
      </ul>

      <h2>Step 4: Claim Your Tokens</h2>
      <p>
        Click the "Claim" button next to the transaction you want to claim. A confirmation dialog will appear showing:
      </p>
      <ul>
        <li>The amount you'll receive</li>
        <li>The estimated gas fee</li>
        <li>Your current balance on the destination chain</li>
      </ul>
      <p>
        Confirm the transaction in your wallet. The claim transaction will be submitted to the destination chain.
      </p>

      <h2>Step 5: Wait for Confirmation</h2>
      <p>
        After submitting the claim transaction, wait for it to be confirmed on the destination chain. This usually takes a few seconds to a few minutes depending on the network.
      </p>
      <p>
        Once confirmed, your tokens will appear in your wallet on the destination chain. You can verify this by checking your wallet balance or viewing the transaction on a block explorer.
      </p>

      <h2>Claiming Multiple Transactions</h2>
      <p>
        If you have multiple pending claims on the same network, you can claim them one at a time. Each claim requires a separate transaction and gas fee.
      </p>
      <div className="bg-accent/50 border border-border rounded-lg p-4 my-4">
        <p className="text-sm mb-0">
          <strong>💡 Tip:</strong> To save on gas fees, consider batching your bridge transfers or claiming during off-peak hours when gas prices are lower.
        </p>
      </div>

      <h2>Transaction Not Ready to Claim?</h2>
      <p>
        If your transaction shows as "Pending" or "Validating", it means the validators haven't finished verifying your transfer yet. This can happen if:
      </p>
      <ul>
        <li>The source chain transaction hasn't received enough confirmations yet</li>
        <li>The validator network is experiencing delays</li>
        <li>There's high network congestion</li>
      </ul>
      <p>
        In most cases, you just need to wait a bit longer. The transaction will automatically become claimable once validation is complete.
      </p>

      <h2>Checking Claim Status</h2>
      <p>
        You can check the status of your claim in several ways:
      </p>
      <ul>
        <li><strong>Claim Page</strong> - Shows all pending and completed claims</li>
        <li><strong>Transaction History</strong> - Available on the main bridge page</li>
        <li><strong>Block Explorer</strong> - Use the transaction hash to view details on the blockchain</li>
      </ul>

      <h2>What If I Don't Claim Immediately?</h2>
      <p>
        There's no time limit for claiming your tokens. Once a transfer is validated, you can claim it at any time - even days or weeks later. Your tokens are safely held by the bridge contract until you claim them.
      </p>
      <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 my-4">
        <p className="text-sm mb-0">
          <strong>⚠️ Important:</strong> Make sure you have enough native tokens on the destination chain to pay for the claim transaction gas fee.
        </p>
      </div>

      <h2>After Claiming</h2>
      <p>
        Once you've successfully claimed your tokens:
      </p>
      <ul>
        <li>The tokens will appear in your wallet on the destination chain</li>
        <li>The transaction will be marked as "Completed" in your history</li>
        <li>You can now use these tokens in DeFi protocols, trade them, or transfer them as needed</li>
      </ul>

      <h2>Need Help?</h2>
      <p>
        If you're having trouble claiming your tokens, check out our <a href="/docs/bridge/troubleshooting">Troubleshooting Guide</a> for common issues and solutions.
      </p>
    </article>
  );
}
