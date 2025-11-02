import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Taishi Program Overview | Fushuma Docs',
  description: 'Learn about the Fushuma Taishi Program and how to become a community leader.',
};

export default function TaishiProgramOverviewPage() {
  return (
    <article>
      <h1>Taishi Program Overview</h1>
      <p className="lead">
        The Fushuma Taishi Program is a community leadership program that empowers dedicated community members to help guide the Fushuma ecosystem. This guide provides an overview of the Taishi Program and how you can get involved.
      </p>

      <h2>What is a Taishi?</h2>
      <p>
        A Taishi is a community leader who is passionate about Fushuma and dedicated to its success. Taishis are responsible for a variety of tasks, including:
      </p>
      <ul>
        <li>
          <strong>Community Moderation:</strong> Helping to keep the Fushuma community a safe and welcoming place.
        </li>
        <li>
          <strong>Content Creation:</strong> Creating guides, tutorials, and other content to help users learn about Fushuma.
        </li>
        <li>
          <strong>Event Organization:</strong> Organizing online and offline events to engage the community.
        </li>
        <li>
          <strong>Feedback and Testing:</strong> Providing feedback on new features and helping to test the Fushuma platform.
        </li>
      </ul>

      <h2>Next Steps</h2>
      <p>
        To learn more about the Fushuma Taishi Program, you can read the following guides:
      </p>
      <ul>
        <li>
          <a href="/docs/taishi/applying">How to Apply</a>
        </li>
        <li>
          <a href="/docs/taishi/responsibilities">Responsibilities</a>
        </li>
      </ul>
    </article>
  );
}
