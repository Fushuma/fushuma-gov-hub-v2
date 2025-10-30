'use client';

import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Rocket, TrendingUp, Users } from 'lucide-react';

export default function LaunchpadPage() {
  const { data: projects, isLoading } = trpc.launchpad.list.useQuery({});

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
              <Rocket className="h-8 w-8 text-primary" />
              Project Launchpad
            </h1>
            <p className="text-muted-foreground text-lg">
              Discover and vote on new projects seeking funding from the Fushuma Treasury
            </p>
          </div>
          <Link href="/launchpad/submit">
            <Button size="lg" className="gap-2">
              <TrendingUp className="h-5 w-5" />
              Submit Project
            </Button>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{projects?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {projects?.filter(p => p.status === 'launched').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Launched</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {projects?.filter(p => p.status === 'voting' || p.status === 'fundraising').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/launchpad/${project.id}`}>
                <Card className="hover:border-primary transition-all duration-200 cursor-pointer h-full hover:shadow-lg">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-xl line-clamp-1">{project.title}</CardTitle>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    {project.tokenSymbol && (
                      <div className="text-sm text-muted-foreground">
                        ${project.tokenSymbol}
                      </div>
                    )}
                    <CardDescription className="line-clamp-3 mt-2">
                      {project.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Funding Goal</span>
                        <span className="font-semibold">{project.fundingAmount.toLocaleString()} FUMA</span>
                      </div>
                      
                      {project.airdropAllocation && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Airdrop</span>
                          <span className="font-semibold text-green-500">
                            {project.airdropAllocation}%
                          </span>
                        </div>
                      )}
                      
                      {(project.status === 'voting' || project.status === 'approved') && (
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-green-500">For: {project.votesFor}</span>
                            <span className="text-red-500">Against: {project.votesAgainst}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${
                                  (project.votesFor || 0) + (project.votesAgainst || 0) > 0
                                    ? ((project.votesFor || 0) / ((project.votesFor || 0) + (project.votesAgainst || 0))) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-4">No projects submitted yet</p>
              <Link href="/launchpad/submit">
                <Button>Be the First to Submit</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
