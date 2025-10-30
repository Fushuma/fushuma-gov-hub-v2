'use client';

import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Vote, Rocket, DollarSign, Users } from 'lucide-react';
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
            title="How to Participate"
            description="As a member of Fushuma VC, you are an investor. You actively discover, validate, and fund the next generation of high-potential projects. The 40% community-controlled Treasury provides the capital; your vote provides the decision."
            href="/governance"
          />
          <FeatureCard
            icon={<Rocket className="h-8 w-8" />}
            title="The Decentralized Venture Club"
            description="● 40% Treasury Under Your Control\n● 100% Transparent On-Chain Voting\n● Direct Airdrops from Funded Projects"
            href="/launchpad"
          />
          <FeatureCard
            icon={<DollarSign className="h-8 w-8" />}
            title="Direct Airdrops from Funded Projects"
            description="Every successful project funded by the Treasury rewards the community with Airdrops. Connect your wallet, vote to support the projects you believe in, and secure your stake in every successful venture."
            href="/grants"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="Build Your Portfolio"
            description="Every successful project funded by the Treasury rewards the community with Airdrops. Connect your wallet, vote to support the projects you believe in, and secure your stake in every successful venture."
            href="/community"
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
        label="Community Members" 
        value="1,234" 
      />
    </section>
  );
}

