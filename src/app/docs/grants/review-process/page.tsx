import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Review Process | Fushuma Docs',
  description: 'Learn about the review process for the Fushuma Grants Program.',
};

export default function ReviewProcessPage() {
  return (
    <article>
      <h1>Review Process</h1>
      <p className="lead">
        This guide explains the review process for the Fushuma Grants Program.
      </p>

      <h2>Initial Review</h2>
      <p>
        Once you have submitted your application, it will be reviewed by the Fushuma team to ensure it meets our basic requirements. We will check to make sure your application is complete, your project is relevant to the Fushuma ecosystem, and your funding request is reasonable.
      </p>

      <h2>Community Review</h2>
      <p>
        If your application passes the initial review, it will be shared with the community for feedback. The community will have the opportunity to ask questions, provide feedback, and voice their support or concerns for your project.
      </p>

      <h2>Final Decision</h2>
      <p>
        After the community review period, the Fushuma team will make a final decision on your application. We will take into account the community feedback, the strength of your project, and the overall benefit to the Fushuma ecosystem.
      </p>

      <h2>Timeline</h2>
      <p>
        The review process typically takes 2-4 weeks. You will be notified of the final decision by email.
      </p>
    </article>
  );
}
