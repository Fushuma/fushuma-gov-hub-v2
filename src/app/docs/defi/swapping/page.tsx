import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Swapping Tokens | Fushuma Docs',
  description: 'Learn how to swap tokens on FumaSwap.',
};

export default function SwappingTokensPage() {
  return (
    <article>
      <h1>Swapping Tokens</h1>
      <p className="lead">
        Swapping tokens on FumaSwap is a simple and fast way to trade cryptocurrencies. This guide will walk you through the process step-by-step.
      </p>

      <h2>1. Go to the Swap Page</h2>
      <p>
        Navigate to the <a href="/defi/fumaswap/swap">Swap page</a> on FumaSwap. You will see the swap widget, which allows you to select the tokens you want to trade.
      </p>

      <h2>2. Connect Your Wallet</h2>
      <p>
        Click the "Connect Wallet" button to connect your wallet to FumaSwap. If you don't have a wallet yet, you can follow our <a href="/docs/getting-started/wallet-setup">wallet setup guide</a>.
      </p>

      <h2>3. Select Tokens</h2>
      <p>
        Choose the token you want to sell from the "From" dropdown and the token you want to buy from the "To" dropdown. You can also enter the amount you want to trade.
      </p>

      <h2>4. Review and Swap</h2>
      <p>
        The swap widget will show you the exchange rate, the amount you will receive, and any fees. If you are happy with the details, click the "Swap" button to confirm the transaction in your wallet.
      </p>

      <h2>5. Slippage Tolerance</h2>
      <p>
        Slippage tolerance is the maximum percentage of price change you are willing to accept for your trade. You can adjust the slippage tolerance in the settings menu. A higher slippage tolerance may be necessary for volatile tokens, but it also increases the risk of your trade executing at a less favorable price.
      </p>
    </article>
  );
}
