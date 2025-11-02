import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Responsibilities | Fushuma Docs',
  description: 'Learn about the responsibilities of a Fushuma Taishi.',
};

export default function ResponsibilitiesPage() {
  return (
    <article>
      <h1>Responsibilities</h1>
      <p className="lead">
        This guide outlines the responsibilities of a Fushuma Taishi.
      </p>

      <h2>Core Responsibilities</h2>
      <ul>
        <li>
          <strong>Be a role model:</strong> Taishis are expected to be positive and helpful members of the community. They should lead by example and embody the values of the Fushuma ecosystem.
        </li>
        <li>
          <strong>Help others:</strong> Taishis should be willing to help other users with their questions and problems. They should be patient, friendly, and knowledgeable.
        </li>
        <li>
          <strong>Promote Fushuma:</strong> Taishis should be passionate about Fushuma and help to promote it to a wider audience. This can be done through social media, content creation, and other forms of outreach.
        </li>
      </ul>

      <h2>Specific Tasks</h2>
      <p>
        In addition to the core responsibilities, Taishis may be asked to help with the following tasks:
      </p>
      <ul>
        <li>Community moderation on Discord and Telegram</li>
        <li>Answering questions on social media</li>
        <li>Writing documentation and tutorials</li>
        <li>Testing new features</li>
        <li>Organizing community events</li>
      </ul>

      <h2>Time Commitment</h2>
      <p>
        The time commitment for a Taishi is flexible. However, we expect Taishis to be active and engaged in the community on a regular basis.
      </p>
    </article>
  );
}
