'use client';

import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Vote, Rocket, DollarSign, Users, ArrowLeftRight, BookOpen, Newspaper, Globe } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-20">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Welcome to the Venture Club
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Fushuma is a community-governed economy. As a token holder, you are an investor. No committees, no central control, you discover, validate, and fund the projects you believe in.
          </p>
          <div className="flex gap-4 justify-center pt-8">
            <Link href="/governance">
              <Button size="lg" className="gap-2">
                Vote on Proposals <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/grants">
              <Button size="lg" variant="outline">
                Apply for Funding
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 py-20">
          <FeatureCard
            icon={<Vote className="h-8 w-8" />}
            title="Governance Portal"
            description="As an investor in the Fushuma VC, you discover, validate, and fund new projects. The Treasury provides the capital; your vote provides the decision."
            href="/governance"
          />
          <FeatureCard
            icon={<Rocket className="h-8 w-8" />}
            title="Launchpad"
            description="Launch your own ICO, or participate in token sales from new ecosystem projects. This is where new ventures get their start."
            href="/launchpad"
          />
          <FeatureCard
            icon={<DollarSign className="h-8 w-8" />}
            title="Grants"
            description="Have an idea that adds value to the ecosystem? Apply for a community grant to get your project funded by the Treasury."
            href="/grants"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="Taishi Program"
            description="Become a Taishi. Join our community leadership program to help guide the ecosystem, lead discussions, and earn rewards for your contributions."
            href="/community"
          />
          <FeatureCard
            icon={<ArrowLeftRight className="h-8 w-8" />}
            title="Bridge"
            description="Bridge tokens seamlessly across multiple blockchain networks. Move your assets between Ethereum, BNB Chain, Polygon, Fushuma, and more with fast, secure transfers."
            href="/defi/bridge"
          />
          <FeatureCard
            icon={<BookOpen className="h-8 w-8" />}
            title="Documentation"
            description="Learn how to use all features of the Fushuma ecosystem. Comprehensive guides for governance, DeFi, bridge, grants, launchpad, and more."
            href="/docs"
          />
          <FeatureCard
            icon={<Newspaper className="h-8 w-8" />}
            title="News"
            description="Stay updated with the latest announcements, project launches, governance decisions, and ecosystem developments from the Fushuma community."
            href="/news"
          />
          <FeatureCard
            icon={<Globe className="h-8 w-8" />}
            title="Ecosystem"
            description="Explore the growing Fushuma ecosystem. Discover projects, dApps, and services built by our community members and funded by the Treasury."
            href="/ecosystem"
          />
        </section>

        {/* Stats Section */}
        <StatsSection />
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, href }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors cursor-pointer h-full">
        <div className="text-primary mb-4">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function StatCard({ label, value, isLoading }: { label: string; value: string | number; isLoading?: boolean }) {
  return (
    <div className="text-center p-8 rounded-lg border border-border bg-card">
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-20 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-32 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="text-4xl font-bold text-primary mb-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="text-muted-foreground">{label}</div>
        </>
      )}
    </div>
  );
}

function StatsSection() {
  const { data: activeProposals, isLoading: loadingProposals } = trpc.proposals.getActive.useQuery({ limit: 100 });
  const { data: grants, isLoading: loadingGrants } = trpc.grants.list.useQuery({ limit: 100 });
  
  const activeProposalsCount = activeProposals?.length || 0;
  const totalGrantsCount = grants?.length || 0;
  
  return (
    <section className="grid md:grid-cols-3 gap-8 py-20">
      <StatCard 
        label="Active Proposals" 
        value={activeProposalsCount} 
        isLoading={loadingProposals}
      />
      <StatCard 
        label="Total Grants" 
        value={totalGrantsCount} 
        isLoading={loadingGrants}
      />
      <StatCard 
        label="Contributors" 
        value="1,234" 
      />
    </section>
  );
}

