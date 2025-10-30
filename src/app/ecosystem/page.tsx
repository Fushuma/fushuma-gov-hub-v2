'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Search, Rocket, Award, Building2 } from 'lucide-react';

// Mock data for ecosystem projects - will be replaced with database query when router is implemented
const ecosystemProjects: Array<{
  id: number;
  name: string;
  category: string;
  description: string;
  website: string;
  logo: string;
  fundingAmount: number | null;
  tokenSymbol: string | null;
}> = [
  {
    id: 1,
    name: 'Fushuma DEX',
    category: 'Core Initiative',
    description: 'Decentralized exchange built on Fushuma Network with PancakeSwap V4 integration, offering low fees and high liquidity.',
    website: 'https://dex.fushuma.com',
    logo: '🔄',
    fundingAmount: null,
    tokenSymbol: null,
  },
  {
    id: 2,
    name: 'Fushuma Bridge',
    category: 'Core Initiative',
    description: 'Cross-chain bridge enabling seamless asset transfers between Fushuma and other major blockchain networks.',
    website: 'https://bridge.fushuma.com',
    logo: '🌉',
    fundingAmount: null,
    tokenSymbol: null,
  },
  {
    id: 3,
    name: 'Fushuma Explorer',
    category: 'Core Initiative',
    description: 'Block explorer and analytics platform for the Fushuma Network, providing transparency and real-time data.',
    website: 'https://fumascan.com',
    logo: '🔍',
    fundingAmount: null,
    tokenSymbol: null,
  },
];

type Category = 'All' | 'Launchpad Alumni' | 'Grant Recipient' | 'Core Initiative';

export default function EcosystemPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category>('All');

  const filteredProjects = ecosystemProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || project.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Launchpad Alumni':
        return <Rocket className="h-4 w-4" />;
      case 'Grant Recipient':
        return <Award className="h-4 w-4" />;
      case 'Core Initiative':
        return <Building2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Launchpad Alumni':
        return 'bg-purple-500';
      case 'Grant Recipient':
        return 'bg-green-500';
      case 'Core Initiative':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Fushuma Ecosystem</h1>
          <p className="text-lg text-muted-foreground">
            Explore projects building on and contributing to the Fushuma Network
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={categoryFilter === 'All' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('All')}
              size="sm"
            >
              All Projects
            </Button>
            <Button
              variant={categoryFilter === 'Core Initiative' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('Core Initiative')}
              size="sm"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Core Initiatives
            </Button>
            <Button
              variant={categoryFilter === 'Launchpad Alumni' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('Launchpad Alumni')}
              size="sm"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Launchpad Alumni
            </Button>
            <Button
              variant={categoryFilter === 'Grant Recipient' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('Grant Recipient')}
              size="sm"
            >
              <Award className="h-4 w-4 mr-2" />
              Grant Recipients
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="text-xl font-semibold mb-2">No Projects Found</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? `No projects match your search for "${searchQuery}"`
                  : 'No projects in this category yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-4xl mb-2">{project.logo}</div>
                    <Badge className={getCategoryColor(project.category)}>
                      <span className="flex items-center gap-1">
                        {getCategoryIcon(project.category)}
                        {project.category}
                      </span>
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  {project.fundingAmount !== null && project.fundingAmount !== undefined && (
                    <div className="mb-4 pb-4 border-b">
                      <div className="text-sm text-muted-foreground">Funding Received</div>
                      <div className="font-bold">
                        {project.fundingAmount.toLocaleString()} {project.tokenSymbol || 'FUMA'}
                      </div>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(project.website, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Website
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Section */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Join the Fushuma Ecosystem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Are you building on Fushuma? Get your project featured in our ecosystem directory by:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
              <li>Applying for a development grant</li>
              <li>Launching your token through our launchpad</li>
              <li>Contributing to the Fushuma core infrastructure</li>
            </ul>
            <div className="flex gap-4">
              <Button onClick={() => window.location.href = '/grants/apply'}>
                Apply for Grant
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/launchpad'}>
                Launch Your Token
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
