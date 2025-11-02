import { Metadata } from 'next';
import { DocHero } from '@/components/docs/DocHero';
import { Rocket } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Launchpad Overview | Fushuma Docs',
  description: 'Learn about the Fushuma Launchpad and how to launch or participate in token sales.',
};

export default function LaunchpadOverviewPage() {
  return (
    <article>
      <DocHero
        title="Launchpad Overview"
        description="The Fushuma Launchpad is a platform for new projects to raise capital and for users to get early access to new tokens."
        icon={Rocket}
      />

      <h2>For Projects</h2>
      <p>
        If you are a project looking to raise funds, the Fushuma Launchpad can help you reach a wide audience of potential investors. We provide a simple and secure way to conduct your token sale.
      </p>

      <h2>For Users</h2>
      <p>
        If you are a user looking to invest in new projects, the Fushuma Launchpad is a great place to find exciting new opportunities. You can participate in token sales and get early access to new tokens before they are listed on exchanges.
      </p>

      <h2>Next Steps</h2>
      <p>
        To learn more about how to use the Fushuma Launchpad, you can read the following guides:
      </p>
      <ul>
        <li>
          <a href="/docs/launchpad/launching">Launching an ICO</a>
        </li>
        <li>
          <a href="/docs/launchpad/participating">Participating in ICOs</a>
        </li>
      </ul>
    </article>
  );
}
