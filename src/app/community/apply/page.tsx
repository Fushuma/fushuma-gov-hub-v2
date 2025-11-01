'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function TaishiApplicationPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    walletAddress: '',
    twitter: '',
    telegram: '',
    github: '',
    contentLinks: '',
    motivation: '',
    contributionPlan: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create GitHub issue body
    const issueBody = `
## Taishi Program Application

**Name:** ${formData.name}
**Email:** ${formData.email}
**Wallet Address:** ${formData.walletAddress}

### Social Profiles
- **Twitter:** ${formData.twitter || 'N/A'}
- **Telegram:** ${formData.telegram || 'N/A'}
- **GitHub:** ${formData.github || 'N/A'}

### Content Links
${formData.contentLinks}

### Why I Support Fushuma
${formData.motivation}

### Contribution Plan
${formData.contributionPlan}
    `.trim();

    // Encode for URL
    const encodedBody = encodeURIComponent(issueBody);
    const githubUrl = `https://github.com/Fushuma/Dev_grants/issues/new?title=${encodeURIComponent(`Taishi Application: ${formData.name}`)}&body=${encodedBody}&labels=taishi-application`;

    // Open GitHub in new tab
    window.open(githubUrl, '_blank');
    
    toast.success('Opening GitHub to submit your application...');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => window.location.href = '/community/taishi'}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Taishi Program
          </Button>

          {/* Header */}
          <div className="text-center mb-8">
            <Badge className="mb-4" variant="outline">Ambassador Program</Badge>
            <h1 className="text-4xl font-bold mb-4">Apply to Taishi Program</h1>
            <p className="text-lg text-muted-foreground">
              Join the Fushuma Ambassador Program and earn rewards for your contributions
            </p>
          </div>

          {/* Application Requirements */}
          <Card className="mb-8 bg-primary/5">
            <CardHeader>
              <CardTitle>Before You Apply</CardTitle>
              <CardDescription>
                Make sure you meet these requirements:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>You have created and shared content about Fushuma over at least 1 month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>You have links to your content (tweets, articles, videos, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>You understand the Taishi Program roles and requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>You have a wallet address to receive FUMA token rewards</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Application Form */}
          <Card>
            <CardHeader>
              <CardTitle>Application Form</CardTitle>
              <CardDescription>
                Fill out this form to submit your Taishi Program application via GitHub
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="walletAddress">Wallet Address *</Label>
                    <Input
                      id="walletAddress"
                      name="walletAddress"
                      value={formData.walletAddress}
                      onChange={handleChange}
                      required
                      placeholder="0x..."
                    />
                    <p className="text-xs text-muted-foreground">
                      This is where you'll receive your FUMA token rewards
                    </p>
                  </div>
                </div>

                {/* Social Profiles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Social Profiles</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter/X Profile</Label>
                    <Input
                      id="twitter"
                      name="twitter"
                      value={formData.twitter}
                      onChange={handleChange}
                      placeholder="https://twitter.com/yourhandle"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegram">Telegram Username</Label>
                    <Input
                      id="telegram"
                      name="telegram"
                      value={formData.telegram}
                      onChange={handleChange}
                      placeholder="@yourusername"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub Profile</Label>
                    <Input
                      id="github"
                      name="github"
                      value={formData.github}
                      onChange={handleChange}
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                </div>

                {/* Content & Motivation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Your Content & Motivation</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contentLinks">Content Links *</Label>
                    <Textarea
                      id="contentLinks"
                      name="contentLinks"
                      value={formData.contentLinks}
                      onChange={handleChange}
                      required
                      rows={6}
                      placeholder="Provide links to your Fushuma-related content (tweets, articles, videos, etc.). One link per line."
                    />
                    <p className="text-xs text-muted-foreground">
                      Include all content you've created about Fushuma over the past month
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivation">Why do you support Fushuma? *</Label>
                    <Textarea
                      id="motivation"
                      name="motivation"
                      value={formData.motivation}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Tell us why you believe in Fushuma and want to be part of the Taishi Program..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contributionPlan">How do you plan to contribute? *</Label>
                    <Textarea
                      id="contributionPlan"
                      name="contributionPlan"
                      value={formData.contributionPlan}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Describe your contribution plan (content types, frequency, target audience, etc.)..."
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button type="submit" size="lg" className="flex-1">
                    Submit Application via GitHub <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  By submitting this application, you'll be redirected to GitHub to create an issue in the Dev_grants repository. 
                  Make sure you're logged into GitHub before submitting.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* What Happens Next */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">1.</span>
                  <span>Your application will be reviewed by the Fushuma team</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">2.</span>
                  <span>Successful applicants will be announced on Fushuma's social channels and GitHub</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">3.</span>
                  <span>You'll be onboarded as a Samurai and can start earning rewards</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">4.</span>
                  <span>Submit monthly reports by the 5th of each month to maintain your status</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
