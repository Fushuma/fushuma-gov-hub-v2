import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Providing Liquidity | Fushuma Docs',
  description: 'Learn how to provide liquidity on FumaSwap and earn fees.',
};

export default function ProvidingLiquidityPage() {
  return (
    <article>
      <h1>Providing Liquidity</h1>
      <p className="lead">
        Providing liquidity on FumaSwap allows you to earn fees from trades. This guide will explain how to add your tokens to a liquidity pool.
      </p>

      <h2>What is a Liquidity Pool?</h2>
      <p>
        A liquidity pool is a collection of two tokens that are locked in a smart contract. These tokens are used to facilitate trades on the exchange. When you provide liquidity, you are adding your tokens to the pool and in return, you receive a share of the trading fees.
      </p>

      <h2>How to Add Liquidity</h2>
      <ol>
        <li>Go to the <a href="/defi/fumaswap/liquidity">Liquidity page</a>.</li>
        <li>Select the two tokens you want to provide as liquidity.</li>
        <li>Enter the amount for one of the tokens, and the other will be calculated automatically based on the current pool ratio.</li>
        <li>Set the price range for your liquidity. This is the range in which your liquidity will be active and earn fees.</li>
        <li>Click "Add Liquidity" and confirm the transaction in your wallet.</li>
      </ol>

      <h2>Concentrated Liquidity</h2>
      <p>
        FumaSwap uses concentrated liquidity, which allows you to provide liquidity in a specific price range. This can be more capital efficient than providing liquidity across the entire price range, as you can earn more fees with less capital. However, it also requires more active management, as you may need to adjust your position if the price moves outside of your range.
      </p>
    </article>
  );
}
