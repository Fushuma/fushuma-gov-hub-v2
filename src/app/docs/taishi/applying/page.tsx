import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Apply | Fushuma Docs',
  description: 'Learn how to apply for the Fushuma Taishi Program.',
};

export default function HowToApplyPage() {
  return (
    <article>
      <h1>How to Apply</h1>
      <p className="lead">
        This guide will walk you through the process of applying for the Fushuma Taishi Program.
      </p>

      <h2>1. Be an Active Community Member</h2>
      <p>
        The first step to becoming a Taishi is to be an active and helpful member of the Fushuma community. This means participating in discussions, helping other users, and contributing to the ecosystem in a positive way.
      </p>

      <h2>2. Go to the Apply for Taishi Program Page</h2>
      <p>
        Navigate to the <a href="/community/apply">Apply for Taishi Program page</a> on the Fushuma Hub.
      </p>

      <h2>3. Fill Out the Application Form</h2>
      <p>
        You will need to provide information about yourself, your experience, and why you want to be a Taishi. Make sure your application is thoughtful and well-written.
      </p>

      <h2>4. Submit Your Application</h2>
      <p>
        Once you have filled out the form, you can submit your application. The Fushuma team will review your application and get back to you with a decision.
      </p>
    </article>
  );
}
