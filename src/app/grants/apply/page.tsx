'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function ApplyGrantPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isAuthenticated, isAuthenticating, signIn } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    applicantName: '',
    contactInfo: '',
    description: '',
    valueProposition: '',
    deliverables: '',
    roadmap: '',
    fundingRequest: '',
    receivingWallet: '',
  });

  const createMutation = trpc.grants.create.useMutation({
    onSuccess: (data) => {
      toast.success('Grant application submitted successfully!');
      router.push(`/grants/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit grant application');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.title.length < 5) {
      toast.error('Title must be at least 5 characters long');
      return;
    }

    if (formData.applicantName.length < 2) {
      toast.error('Applicant name must be at least 2 characters long');
      return;
    }

    if (formData.description.length < 50) {
      toast.error('Description must be at least 50 characters long');
      return;
    }

    if (formData.valueProposition.length < 50) {
      toast.error('Value proposition must be at least 50 characters long');
      return;
    }

    if (formData.deliverables.length < 50) {
      toast.error('Deliverables must be at least 50 characters long');
      return;
    }

    if (formData.roadmap.length < 50) {
      toast.error('Roadmap must be at least 50 characters long');
      return;
    }

    const fundingRequest = parseInt(formData.fundingRequest);
    if (isNaN(fundingRequest) || fundingRequest <= 0) {
      toast.error('Funding request must be a positive number');
      return;
    }

    // Validate wallet address if provided
    if (formData.receivingWallet && !/^0x[a-fA-F0-9]{40}$/.test(formData.receivingWallet)) {
      toast.error('Invalid wallet address format');
      return;
    }

    createMutation.mutate({
      title: formData.title,
      applicantName: formData.applicantName,
      contactInfo: formData.contactInfo || undefined,
      description: formData.description,
      valueProposition: formData.valueProposition,
      deliverables: formData.deliverables,
      roadmap: formData.roadmap,
      fundingRequest,
      receivingWallet: formData.receivingWallet || undefined,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/grants')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Grants
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Apply for Development Grant</CardTitle>
            <CardDescription>
              Submit your project proposal to receive funding from the Fushuma community treasury.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Authentication Check */}
            {!isConnected ? (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-3">
                    <span>Please connect your wallet to apply for a grant.</span>
                    <ConnectButton />
                  </div>
                </AlertDescription>
              </Alert>
            ) : !isAuthenticated ? (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-3">
                    <span>Please sign in to apply for a grant. This requires signing a message with your wallet to verify ownership.</span>
                    <Button onClick={signIn} disabled={isAuthenticating} className="w-fit">
                      {isAuthenticating ? 'Signing in...' : 'Sign In with Wallet'}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Project Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Fushuma DEX Aggregator"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    required
                    minLength={5}
                    maxLength={255}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.title.length}/255 characters
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="applicantName">
                      Applicant Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="applicantName"
                      placeholder="Your name or team name"
                      value={formData.applicantName}
                      onChange={(e) => handleChange('applicantName', e.target.value)}
                      required
                      minLength={2}
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactInfo">
                      Contact Information
                    </Label>
                    <Input
                      id="contactInfo"
                      placeholder="Email, Telegram, or Discord"
                      value={formData.contactInfo}
                      onChange={(e) => handleChange('contactInfo', e.target.value)}
                      maxLength={255}
                    />
                  </div>
                </div>
              </div>

              {/* Project Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Project Description</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[150px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Describe your project, what it does, and why it's needed in the Fushuma ecosystem..."
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    required
                    minLength={50}
                    maxLength={10000}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.description.length}/10,000 characters (minimum 50)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valueProposition">
                    Value Proposition <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="valueProposition"
                    className="w-full min-h-[120px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="What value does this project bring to the Fushuma ecosystem? How will it benefit users and the community?"
                    value={formData.valueProposition}
                    onChange={(e) => handleChange('valueProposition', e.target.value)}
                    required
                    minLength={50}
                    maxLength={5000}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.valueProposition.length}/5,000 characters (minimum 50)
                  </p>
                </div>
              </div>

              {/* Deliverables & Roadmap */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Deliverables & Timeline</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="deliverables">
                    Deliverables <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="deliverables"
                    className="w-full min-h-[120px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="List the specific deliverables you will provide (e.g., smart contracts, frontend application, documentation, etc.)"
                    value={formData.deliverables}
                    onChange={(e) => handleChange('deliverables', e.target.value)}
                    required
                    minLength={50}
                    maxLength={5000}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.deliverables.length}/5,000 characters (minimum 50)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roadmap">
                    Roadmap <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="roadmap"
                    className="w-full min-h-[120px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Provide a timeline for development milestones and expected completion dates..."
                    value={formData.roadmap}
                    onChange={(e) => handleChange('roadmap', e.target.value)}
                    required
                    minLength={50}
                    maxLength={5000}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.roadmap.length}/5,000 characters (minimum 50)
                  </p>
                </div>
              </div>

              {/* Funding Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Funding Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fundingRequest">
                      Funding Request (FUMA) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fundingRequest"
                      type="number"
                      placeholder="50000"
                      value={formData.fundingRequest}
                      onChange={(e) => handleChange('fundingRequest', e.target.value)}
                      required
                      min="1"
                    />
                    <p className="text-sm text-muted-foreground">
                      Amount in FUMA tokens
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receivingWallet">
                      Receiving Wallet Address
                    </Label>
                    <Input
                      id="receivingWallet"
                      placeholder="0x..."
                      value={formData.receivingWallet}
                      onChange={(e) => handleChange('receivingWallet', e.target.value)}
                      pattern="^0x[a-fA-F0-9]{40}$"
                    />
                    <p className="text-sm text-muted-foreground">
                      Optional: Wallet to receive funds
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !isAuthenticated}
                  className="flex-1"
                >
                  {createMutation.isPending ? 'Submitting...' : !isAuthenticated ? 'Sign in to Submit' : 'Submit Application'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/grants')}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Application Process:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Your application will be reviewed by the community</li>
                  <li>Applications may be synced with GitHub for community discussion</li>
                  <li>Approved grants may be paid in milestones</li>
                  <li>You'll be notified of status changes via your contact information</li>
                  <li>Be prepared to provide additional information if requested</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
