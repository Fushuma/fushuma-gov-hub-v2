import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Managing Positions | Fushuma Docs',
  description: 'Learn how to manage your liquidity positions on FumaSwap.',
};

export default function ManagingPositionsPage() {
  return (
    <article>
      <h1>Managing Positions</h1>
      <p className="lead">
        Once you have provided liquidity, you can manage your positions from the <a href="/defi/fumaswap/positions">Positions page</a>. This guide will explain how to view your positions, collect fees, and remove your liquidity.
      </p>

      <h2>Viewing Your Positions</h2>
      <p>
        On the Positions page, you will see a list of all your liquidity positions. Each position will show the token pair, the price range, the amount of liquidity you have provided, and any unclaimed fees.
      </p>

      <h2>Collecting Fees</h2>
      <p>
        You can collect the fees you have earned from your liquidity positions at any time. Simply click the "Collect Fees" button on your position and confirm the transaction in your wallet.
      </p>

      <h2>Removing Liquidity</h2>
      <p>
        You can remove your liquidity from a pool at any time. To do so, click the "Remove Liquidity" button on your position. You can choose to remove all or a portion of your liquidity. Once you have confirmed the transaction in your wallet, your tokens will be returned to you.
      </p>

      <h2>In-Range vs. Out-of-Range</h2>
      <p>
        Your liquidity position is considered "in-range" when the current price of the token pair is within the price range you have set. When your position is in-range, you will earn trading fees. If the price moves outside of your range, your position will be considered "out-of-range" and you will no longer earn fees. You may need to create a new position with a different price range to continue earning fees.
      </p>
    </article>
  );
}
