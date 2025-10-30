'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateProposalPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quorum: '100',
    startDate: '',
    endDate: '',
  });

  const createMutation = trpc.proposals.create.useMutation({
    onSuccess: (data) => {
      toast.success('Proposal created successfully!');
      router.push(`/governance/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create proposal');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.title.length < 5) {
      toast.error('Title must be at least 5 characters long');
      return;
    }

    if (formData.description.length < 50) {
      toast.error('Description must be at least 50 characters long');
      return;
    }

    const quorum = parseInt(formData.quorum);
    if (isNaN(quorum) || quorum <= 0) {
      toast.error('Quorum must be a positive number');
      return;
    }

    // Prepare dates
    const startDate = formData.startDate ? new Date(formData.startDate) : undefined;
    const endDate = formData.endDate ? new Date(formData.endDate) : undefined;

    // Validate dates if provided
    if (startDate && endDate && startDate >= endDate) {
      toast.error('End date must be after start date');
      return;
    }

    createMutation.mutate({
      title: formData.title,
      description: formData.description,
      quorum,
      startDate,
      endDate,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/governance')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Proposals
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Create New Proposal</CardTitle>
            <CardDescription>
              Submit a new governance proposal for the Fushuma community to vote on.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Proposal Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Protocol Upgrade: Fushuma V3"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                  minLength={5}
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground">
                  {formData.title.length}/500 characters (minimum 5)
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="description"
                  className="w-full min-h-[200px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Provide a detailed description of your proposal, including the problem it solves, the proposed solution, and expected outcomes..."
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

              {/* Quorum */}
              <div className="space-y-2">
                <Label htmlFor="quorum">
                  Quorum (Minimum Votes Required)
                </Label>
                <Input
                  id="quorum"
                  type="number"
                  placeholder="100"
                  value={formData.quorum}
                  onChange={(e) => handleChange('quorum', e.target.value)}
                  min="1"
                />
                <p className="text-sm text-muted-foreground">
                  Default is 100 votes. This is the minimum number of votes required for the proposal to be valid.
                </p>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date (Optional)
                </Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to start voting immediately.
                </p>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate">
                  End Date (Optional)
                </Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to set voting period to 7 days from start.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Proposal'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/governance')}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Important Notes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Your wallet address will be recorded as the proposer</li>
                  <li>Proposals start in "pending" status and must be activated by an admin</li>
                  <li>Once created, proposals cannot be edited</li>
                  <li>Make sure to provide clear and detailed information</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
