import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launching an ICO | Fushuma Docs',
  description: 'Learn how to launch your own ICO on the Fushuma Launchpad.',
};

export default function LaunchingAnICOPage() {
  return (
    <article>
      <h1>Launching an ICO</h1>
      <p className="lead">
        This guide will walk you through the process of launching your own Initial Coin Offering (ICO) on the Fushuma Launchpad.
      </p>

      <h2>1. Prepare Your Project</h2>
      <p>
        Before you can launch your ICO, you will need to have a solid project with a clear vision and a strong team. You should also have a whitepaper that explains your project in detail.
      </p>

      <h2>2. Go to the Create ICO Page</h2>
      <p>
        Navigate to the <a href="/launchpad/create">Create ICO page</a> on the Fushuma Hub.
      </p>

      <h2>3. Fill Out the ICO Form</h2>
      <p>
        You will need to provide information about your project, your token, and your token sale. This includes:
      </p>
      <ul>
        <li>Project name and description</li>
        <li>Token name, symbol, and total supply</li>
        <li>Token sale start and end dates</li>
        <li>Token price</li>
        <li>Fundraising goal</li>
      </ul>

      <h2>4. Submit Your ICO for Review</h2>
      <p>
        Once you have filled out the form, you can submit your ICO for review. The Fushuma team will review your project to ensure it meets our quality standards. If your project is approved, it will be listed on the Launchpad.
      </p>

      <h2>5. Launch Your ICO</h2>
      <p>
        Once your ICO is listed on the Launchpad, users will be able to participate in your token sale. You will be able to track the progress of your ICO from your project dashboard.
      </p>
    </article>
  );
}
