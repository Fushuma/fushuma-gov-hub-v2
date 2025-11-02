import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Apply | Fushuma Docs',
  description: 'Learn how to apply for a grant from the Fushuma Grants Program.',
};

export default function HowToApplyPage() {
  return (
    <article>
      <h1>How to Apply</h1>
      <p className="lead">
        This guide will walk you through the process of applying for a grant from the Fushuma Grants Program.
      </p>

      <h2>1. Prepare Your Application</h2>
      <p>
        Before you apply, you should have a clear idea of what you want to build and how it will benefit the Fushuma ecosystem. You should also have a detailed budget and timeline for your project.
      </p>

      <h2>2. Go to the Apply for Grant Page</h2>
      <p>
        Navigate to the <a href="/grants/apply">Apply for Grant page</a> on the Fushuma Hub.
      </p>

      <h2>3. Fill Out the Application Form</h2>
      <p>
        You will need to provide information about your project, your team, and your funding request. Make sure your application is clear, concise, and easy to understand.
      </p>

      <h2>4. Submit Your Application</h2>
      <p>
        Once you have filled out the form, you can submit your application. The Fushuma team will review your application and get back to you with a decision.
      </p>
    </article>
  );
}
