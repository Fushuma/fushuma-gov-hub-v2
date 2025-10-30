'use client';

import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, ExternalLink, TrendingUp, Users, Calendar, Target } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function LaunchpadDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  
  const { data: project, isLoading } = trpc.launchpad.getById.useQuery({ id });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'voting':
        return 'bg-blue-500';
      case 'approved':
        return 'bg-green-500';
      case 'fundraising':
        return 'bg-purple-500';
      case 'launched':
        return 'bg-emerald-500';
      case 'rejected':
        return 'bg-red-500';
      case 'review':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">Project not found</p>
              <Link href="/launchpad">
                <Button className="mt-4">Back to Launchpad</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const totalVotes = (project.votesFor || 0) + (project.votesAgainst || 0);
  const votePercentage = totalVotes > 0 ? ((project.votesFor || 0) / totalVotes) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/launchpad">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Launchpad
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{project.title}</h1>
              {project.tokenSymbol && (
                <p className="text-xl text-muted-foreground">${project.tokenSymbol}</p>
              )}
            </div>
            <Badge className={getStatusColor(project.status)} variant="default">
              {project.status.toUpperCase()}
            </Badge>
          </div>
          
          {project.websiteUrl && (
            <a
              href={project.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              Visit Website
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {project.description}
                </p>
              </CardContent>
            </Card>

            {/* Team Background */}
            {project.teamBackground && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Background
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {project.teamBackground}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Tokenomics */}
            {project.tokenomics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tokenomics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {project.tokenomics}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Roadmap */}
            {project.roadmap && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {project.roadmap}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Funding Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Funding Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Funding Goal</p>
                  <p className="text-2xl font-bold">
                    {project.fundingAmount.toLocaleString()} FUMA
                  </p>
                </div>
                
                {project.airdropAllocation && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Community Airdrop</p>
                    <p className="text-2xl font-bold text-green-500">
                      {project.airdropAllocation}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voting */}
            {(project.status === 'voting' || project.status === 'approved' || project.status === 'fundraising') && (
              <Card>
                <CardHeader>
                  <CardTitle>Community Vote</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-500">For: {project.votesFor || 0}</span>
                      <span className="text-red-500">Against: {project.votesAgainst || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all"
                        style={{ width: `${votePercentage}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      {votePercentage.toFixed(1)}% approval
                    </p>
                  </div>

                  {project.status === 'voting' && (
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-green-500 hover:bg-green-600">
                        Vote For
                      </Button>
                      <Button variant="destructive" className="flex-1">
                        Vote Against
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
