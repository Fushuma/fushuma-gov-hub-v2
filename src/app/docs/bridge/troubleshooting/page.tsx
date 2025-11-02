import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bridge Troubleshooting | Fushuma Docs',
  description: 'Common issues and solutions for using the Fushuma Bridge.',
};

export default function TroubleshootingPage() {
  return (
    <article>
      <h1>Bridge Troubleshooting</h1>
      <p className="lead">
        Having issues with the bridge? This guide covers common problems and their solutions.
      </p>

      <h2>Transaction Stuck on "Pending"</h2>
      <h3>Problem</h3>
      <p>
        Your bridge transaction has been confirmed on the source chain, but it's still showing as "Pending" or "Validating" and you can't claim your tokens yet.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Wait for Confirmations</strong> - The bridge requires a certain number of block confirmations before tokens can be claimed. This typically takes 5-15 minutes but can be longer during high network congestion.</li>
        <li><strong>Check Validator Status</strong> - The validator network needs to sign off on your transfer. If there are validator issues, this process may take longer than usual.</li>
        <li><strong>Verify Transaction Hash</strong> - Use a block explorer to confirm your transaction was successful on the source chain.</li>
        <li><strong>Refresh the Page</strong> - Sometimes the interface needs to be refreshed to update the transaction status.</li>
      </ul>

      <h2>Wrong Network Connected</h2>
      <h3>Problem</h3>
      <p>
        You're trying to bridge or claim tokens, but your wallet is connected to the wrong network.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Use Network Switcher</strong> - Click the "Switch Network" button in the interface to automatically switch to the correct network.</li>
        <li><strong>Manual Switch</strong> - Open your wallet and manually select the correct network from the network dropdown.</li>
        <li><strong>Add Network</strong> - If the destination network isn't in your wallet, you may need to add it manually. Check the network's official documentation for RPC details.</li>
      </ul>

      <h2>Insufficient Gas Fees</h2>
      <h3>Problem</h3>
      <p>
        Your transaction fails because you don't have enough native tokens to pay for gas fees.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Get Native Tokens</strong> - Acquire some native tokens for the network you're transacting on (e.g., ETH for Ethereum, BNB for BNB Chain).</li>
        <li><strong>Bridge During Off-Peak</strong> - Gas fees are typically lower during off-peak hours. Try bridging at different times of day.</li>
        <li><strong>Check Balance</strong> - Make sure you have enough tokens not just for the bridge transaction, but also for the claim transaction on the destination chain.</li>
      </ul>

      <h2>Token Not Appearing in Wallet</h2>
      <h3>Problem</h3>
      <p>
        You've claimed your tokens, but they're not showing up in your wallet.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Add Token to Wallet</strong> - Your wallet may not automatically display the token. You need to manually add the token contract address to your wallet.</li>
        <li><strong>Check Correct Network</strong> - Make sure your wallet is connected to the destination network where you claimed the tokens.</li>
        <li><strong>Wait for Confirmation</strong> - The claim transaction may still be processing. Check the transaction status on a block explorer.</li>
        <li><strong>Verify Transaction</strong> - Use a block explorer to confirm the claim transaction was successful and tokens were transferred to your address.</li>
      </ul>

      <h2>Approval Transaction Failed</h2>
      <h3>Problem</h3>
      <p>
        The token approval transaction failed or was rejected.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Check Gas Limit</strong> - Make sure you have enough gas to complete the approval transaction.</li>
        <li><strong>Increase Gas Price</strong> - During high network congestion, you may need to increase the gas price for the transaction to go through.</li>
        <li><strong>Try Again</strong> - Sometimes transactions fail due to temporary network issues. Wait a moment and try again.</li>
        <li><strong>Clear Previous Approval</strong> - If you have an existing approval for this token, you may need to revoke it first before setting a new one.</li>
      </ul>

      <h2>Bridge Interface Not Loading</h2>
      <h3>Problem</h3>
      <p>
        The bridge interface is not loading properly or showing errors.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Clear Browser Cache</strong> - Clear your browser cache and cookies, then reload the page.</li>
        <li><strong>Try Different Browser</strong> - Test the bridge in a different browser to rule out browser-specific issues.</li>
        <li><strong>Disable Extensions</strong> - Some browser extensions can interfere with Web3 applications. Try disabling them temporarily.</li>
        <li><strong>Check Internet Connection</strong> - Ensure you have a stable internet connection.</li>
        <li><strong>Update Wallet</strong> - Make sure your wallet extension is up to date.</li>
      </ul>

      <h2>Transaction History Not Showing</h2>
      <h3>Problem</h3>
      <p>
        Your previous bridge transactions are not appearing in the transaction history.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Connect Same Wallet</strong> - Transaction history is tied to your wallet address. Make sure you're connected with the same wallet you used for the transactions.</li>
        <li><strong>Check Correct Network</strong> - Switch to the network where you initiated the bridge transaction.</li>
        <li><strong>Use Transaction Hash</strong> - If you have the transaction hash, you can look it up directly on a block explorer.</li>
        <li><strong>Wait for Indexing</strong> - Very recent transactions may take a few minutes to appear in the history.</li>
      </ul>

      <h2>High Bridge Fees</h2>
      <h3>Problem</h3>
      <p>
        The bridge fees seem unusually high.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Understand Fee Structure</strong> - Bridge fees include both the bridge protocol fee and gas fees on both chains. Gas fees can be high during network congestion.</li>
        <li><strong>Bridge Larger Amounts</strong> - Fixed fees are more economical when bridging larger amounts.</li>
        <li><strong>Choose Different Route</strong> - Some network pairs may have lower fees than others.</li>
        <li><strong>Wait for Lower Gas</strong> - Monitor gas prices and bridge when they're lower (typically during weekends or off-peak hours).</li>
      </ul>

      <h2>Claim Button Disabled</h2>
      <h3>Problem</h3>
      <p>
        The claim button is greyed out and you can't click it.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Check Network</strong> - Make sure you're connected to the destination network.</li>
        <li><strong>Wait for Validation</strong> - The transaction may not be ready to claim yet. Check the status message.</li>
        <li><strong>Check Gas Balance</strong> - You need native tokens on the destination chain to pay for the claim transaction.</li>
        <li><strong>Already Claimed</strong> - Verify that you haven't already claimed this transaction.</li>
      </ul>

      <h2>Slippage or Price Impact Warnings</h2>
      <h3>Problem</h3>
      <p>
        You're seeing warnings about high slippage or price impact.
      </p>
      <h3>Solutions</h3>
      <ul>
        <li><strong>Understand the Warning</strong> - Bridging typically has minimal slippage since it's a 1:1 transfer, not a swap. However, you may see warnings if there's insufficient liquidity.</li>
        <li><strong>Check Token Pair</strong> - Make sure you're bridging a supported token pair.</li>
        <li><strong>Reduce Amount</strong> - Try bridging a smaller amount if liquidity is limited.</li>
      </ul>

      <h2>Still Need Help?</h2>
      <p>
        If you've tried these solutions and are still experiencing issues:
      </p>
      <ul>
        <li><strong>Document the Issue</strong> - Take screenshots and note down transaction hashes, error messages, and the steps you took.</li>
        <li><strong>Check Block Explorer</strong> - Use a blockchain explorer to verify the status of your transactions on-chain.</li>
        <li><strong>Contact Support</strong> - Reach out to the Fushuma community support channels with your documentation.</li>
        <li><strong>Check Network Status</strong> - Visit the status pages for the networks you're using to see if there are any known issues.</li>
      </ul>

      <div className="bg-accent/50 border border-border rounded-lg p-4 my-4">
        <p className="text-sm mb-0">
          <strong>💡 Pro Tip:</strong> Always keep a record of your transaction hashes. They're essential for troubleshooting and can help support teams assist you more quickly.
        </p>
      </div>
    </article>
  );
}
