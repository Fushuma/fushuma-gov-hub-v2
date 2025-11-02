import { Metadata } from 'next';
import { DocHero } from '@/components/docs/DocHero';
import { DollarSign } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Grants Overview | Fushuma Docs',
  description: 'Learn about the Fushuma grants program and how to get funding for your project.',
};

export default function GrantsOverviewPage() {
  return (
    <article>
      <DocHero
        title="Grants Overview"
        description="The Fushuma Grants Program is a community-led initiative to fund projects that add value to the Fushuma ecosystem."
        icon={DollarSign}
      />

      <h2>What We Fund</h2>
      <p>
        We fund a wide range of projects, including:
      </p>
      <ul>
        <li>
          <strong>dApps:</strong> New and innovative decentralized applications.
        </li>
        <li>
          <strong>Tooling:</strong> Developer tools and infrastructure.
        </li>
        <li>
          <strong>Community:</strong> Initiatives that grow and engage the Fushuma community.
        </li>
        <li>
          <strong>Research:</strong> Research into new technologies and ideas.
        </li>
      </ul>

      <h2>Next Steps</h2>
      <p>
        To learn more about the Fushuma Grants Program, you can read the following guides:
      </p>
      <ul>
        <li>
          <a href="/docs/grants/applying">How to Apply</a>
        </li>
        <li>
          <a href="/docs/grants/review-process">Review Process</a>
        </li>
      </ul>
    </article>
  );
}
