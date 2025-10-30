'use client';

import { useParams, useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, Calendar, User, DollarSign, ExternalLink, Github } from 'lucide-react';
import { format } from 'date-fns';

export default function GrantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const grantId = parseInt(params.id as string);

  const { data: grant, isLoading, error } = trpc.grants.getById.useQuery(
    { id: grantId },
    { enabled: !isNaN(grantId) }
  );

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-purple-500';
      case 'rejected':
        return 'bg-red-500';
      case 'review':
        return 'bg-yellow-500';
      case 'submitted':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isNaN(grantId)) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Invalid Grant ID</h1>
            <Button onClick={() => router.push('/grants')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Grants
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !grant) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Grant Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The grant application you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/grants')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Grants
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <Button
          variant="ghost"
          onClick={() => router.push('/grants')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Grants
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Grant Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start mb-4">
                  <CardTitle className="text-3xl font-bold">{grant.title}</CardTitle>
                  <Badge className={getStatusClass(grant.status)}>
                    {getStatusLabel(grant.status)}
                  </Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{grant.applicantName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Submitted {format(new Date(grant.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{grant.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Value Proposition */}
            <Card>
              <CardHeader>
                <CardTitle>Value Proposition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{grant.valueProposition}</p>
                </div>
              </CardContent>
            </Card>

            {/* Deliverables */}
            <Card>
              <CardHeader>
                <CardTitle>Deliverables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{grant.deliverables}</p>
                </div>
              </CardContent>
            </Card>

            {/* Roadmap */}
            <Card>
              <CardHeader>
                <CardTitle>Roadmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{grant.roadmap}</p>
                </div>
              </CardContent>
            </Card>

            {/* GitHub Integration */}
            {grant.githubIssueUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="h-5 w-5" />
                    GitHub Discussion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Issue Number:</span>
                      <span className="font-medium">#{grant.githubIssueNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline">{grant.githubIssueState}</Badge>
                    </div>
                    {grant.githubCommentCount !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Comments:</span>
                        <span className="font-medium">{grant.githubCommentCount}</span>
                      </div>
                    )}
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(grant.githubIssueUrl!, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on GitHub
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Funding Information */}
            <Card>
              <CardHeader>
                <CardTitle>Funding Request</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-3xl font-bold">
                      {grant.fundingRequest.toLocaleString()} FUMA
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applicant Information */}
            <Card>
              <CardHeader>
                <CardTitle>Applicant Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Name</div>
                  <div className="font-medium">{grant.applicantName}</div>
                </div>
                {grant.contactInfo && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Contact</div>
                    <div className="font-medium break-all">{grant.contactInfo}</div>
                  </div>
                )}
                {grant.receivingWallet && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Wallet Address</div>
                    <div className="font-mono text-sm break-all">{grant.receivingWallet}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="font-medium">
                    {format(new Date(grant.createdAt), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">
                    {format(new Date(grant.updatedAt), 'MMM dd, yyyy')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* GitHub Author Info */}
            {grant.githubAuthor && (
              <Card>
                <CardHeader>
                  <CardTitle>GitHub Author</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {grant.githubAuthorAvatar && (
                      <img
                        src={grant.githubAuthorAvatar}
                        alt={grant.githubAuthor}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium">{grant.githubAuthor}</div>
                      <div className="text-sm text-muted-foreground">GitHub User</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
