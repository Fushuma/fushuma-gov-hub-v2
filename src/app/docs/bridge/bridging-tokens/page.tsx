import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Bridge Tokens | Fushuma Docs',
  description: 'Step-by-step guide to bridging tokens across blockchain networks.',
};

export default function BridgingTokensPage() {
  return (
    <article>
      <h1>How to Bridge Tokens</h1>
      <p className="lead">
        This guide will walk you through the process of bridging tokens from one blockchain network to another using the Fushuma Bridge.
      </p>

      <h2>Before You Start</h2>
      <p>
        Make sure you have:
      </p>
      <ul>
        <li>A connected Web3 wallet with tokens you want to bridge</li>
        <li>Enough native tokens for gas fees on the source chain (e.g., ETH on Ethereum, BNB on BNB Chain)</li>
        <li>Some native tokens on the destination chain for future transactions</li>
      </ul>

      <h2>Step 1: Navigate to the Bridge</h2>
      <p>
        Go to the <a href="/defi/bridge/swap">Bridge page</a> in the DeFi section. You'll see the bridge interface with options to select your source and destination networks.
      </p>

      <h2>Step 2: Connect Your Wallet</h2>
      <p>
        Click the "Connect Wallet" button in the top right corner. Select your wallet provider (MetaMask, WalletConnect, etc.) and approve the connection. Make sure your wallet is connected to the correct network that matches your source chain.
      </p>

      <h2>Step 3: Select Networks</h2>
      <p>
        Choose your source network (where your tokens currently are) and your destination network (where you want to send them). You can use the network selector dropdowns to pick from the available options.
      </p>
      <div className="bg-accent/50 border border-border rounded-lg p-4 my-4">
        <p className="text-sm mb-0">
          <strong>💡 Tip:</strong> Your wallet will automatically switch to the source network if it's not already connected to it.
        </p>
      </div>

      <h2>Step 4: Select Token and Amount</h2>
      <p>
        Choose the token you want to bridge from the token dropdown. Enter the amount you wish to transfer. The interface will show you:
      </p>
      <ul>
        <li>Your current balance on the source chain</li>
        <li>The amount you'll receive on the destination chain</li>
        <li>Bridge fees and estimated gas costs</li>
        <li>Estimated transfer time</li>
      </ul>

      <h2>Step 5: Approve Token (if needed)</h2>
      <p>
        If this is your first time bridging a particular token, you'll need to approve the bridge contract to spend your tokens. Click the "Approve" button and confirm the transaction in your wallet. This is a one-time approval per token.
      </p>
      <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 my-4">
        <p className="text-sm mb-0">
          <strong>⚠️ Important:</strong> The approval transaction will cost gas fees. Wait for it to confirm before proceeding to the next step.
        </p>
      </div>

      <h2>Step 6: Initiate the Bridge Transfer</h2>
      <p>
        Once the approval is complete (or if you've already approved this token), click the "Bridge" or "Transfer" button. Review the transaction details carefully:
      </p>
      <ul>
        <li>Source network and token</li>
        <li>Destination network and token</li>
        <li>Amount being transferred</li>
        <li>Total fees</li>
      </ul>
      <p>
        Confirm the transaction in your wallet. This will lock your tokens on the source chain.
      </p>

      <h2>Step 7: Wait for Validation</h2>
      <p>
        After your transaction is confirmed on the source chain, the bridge validators will verify the transfer. This typically takes 5-15 minutes depending on network congestion and the number of block confirmations required.
      </p>
      <p>
        You can monitor the progress in the transaction history section or by checking the transaction hash on a block explorer.
      </p>

      <h2>Step 8: Claim Your Tokens</h2>
      <p>
        Once the validators have confirmed your transfer, you'll need to claim your tokens on the destination chain. You can do this in two ways:
      </p>
      <ul>
        <li>The interface may show a "Claim" button when your transfer is ready</li>
        <li>Navigate to the <a href="/defi/bridge/claim">Claim page</a> to see all pending claims</li>
      </ul>
      <p>
        Click "Claim" and confirm the transaction in your wallet. Make sure your wallet is connected to the destination network. After this transaction confirms, your tokens will appear in your wallet on the destination chain.
      </p>

      <h2>Transaction History</h2>
      <p>
        All your bridge transactions are tracked and displayed in the transaction history section. You can view:
      </p>
      <ul>
        <li>Transaction status (pending, ready to claim, completed)</li>
        <li>Source and destination networks</li>
        <li>Token amounts</li>
        <li>Transaction timestamps</li>
        <li>Links to block explorers</li>
      </ul>

      <h2>Best Practices</h2>
      <ul>
        <li><strong>Start Small</strong> - Test with a small amount first if you're new to bridging</li>
        <li><strong>Check Gas Fees</strong> - Bridge during off-peak hours to save on gas costs</li>
        <li><strong>Keep Native Tokens</strong> - Always maintain some native tokens on both chains for gas fees</li>
        <li><strong>Double-Check Networks</strong> - Verify you've selected the correct source and destination networks</li>
        <li><strong>Save Transaction Hashes</strong> - Keep a record of your transaction hashes for reference</li>
      </ul>

      <h2>Need Help?</h2>
      <p>
        If you encounter any issues while bridging, check out our <a href="/docs/bridge/troubleshooting">Troubleshooting Guide</a> or visit our community support channels.
      </p>
    </article>
  );
}
