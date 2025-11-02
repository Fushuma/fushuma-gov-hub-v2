import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Glossary | Fushuma Docs',
  description: 'A glossary of common terms used in the Fushuma ecosystem.',
};

export default function GlossaryPage() {
  return (
    <article>
      <h1>Glossary</h1>
      <p className="lead">
        Confused by some of the terms used in the Fushuma ecosystem? This glossary will help you understand the lingo.
      </p>

      <dl>
        <dt>AMM</dt>
        <dd>Automated Market Maker. A type of decentralized exchange (DEX) that uses a mathematical formula to price assets.</dd>

        <dt>APR</dt>
        <dd>Annual Percentage Rate. The annual rate of return on an investment.</dd>

        <dt>APY</dt>
        <dd>Annual Percentage Yield. The annual rate of return on an investment, taking into account the effect of compounding.</dd>

        <dt>DAO</dt>
        <dd>Decentralized Autonomous Organization. An organization that is run by a set of rules encoded in smart contracts.</dd>

        <dt>DEX</dt>
        <dd>Decentralized Exchange. A cryptocurrency exchange that is not operated by a central authority.</dd>

        <dt>ERC-20</dt>
        <dd>A standard for creating tokens on the Ethereum blockchain. Many tokens on the Fushuma Network are also ERC-20 tokens.</dd>

        <dt>Gas</dt>
        <dd>The fee paid to the network to execute a transaction.</dd>

        <dt>ICO</dt>
        <dd>Initial Coin Offering. A fundraising method in which a new project sells its tokens to the public.</dd>

        <dt>Liquidity</dt>
        <dd>The ease with which an asset can be bought or sold without affecting its price.</dd>

        <dt>Liquidity Pool</dt>
        <dd>A collection of two tokens that are locked in a smart contract to facilitate trades on a DEX.</dd>

        <dt>Slippage</dt>
        <dd>The difference between the expected price of a trade and the price at which the trade is executed.</dd>

        <dt>Smart Contract</dt>
        <dd>A self-executing contract with the terms of the agreement directly written into code.</dd>

        <dt>TVL</dt>
        <dd>Total Value Locked. The total value of all assets locked in a DeFi protocol.</dd>

        <dt>Yield Farming</dt>
        <dd>The practice of staking or lending crypto assets in order to generate high returns or rewards in the form of additional cryptocurrency.</dd>
      </dl>
    </article>
  );
}
