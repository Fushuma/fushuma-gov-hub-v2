import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Vote, Rocket, DollarSign, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-20">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Fushuma Governance Hub
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            The nexus for community interaction, governance, and economic activity in the Fushuma ecosystem
          </p>
          <div className="flex gap-4 justify-center pt-8">
            <Link href="/governance">
              <Button size="lg" className="gap-2">
                Explore Governance <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/grants">
              <Button size="lg" variant="outline">
                View Grants
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 py-20">
          <FeatureCard
            icon={<Vote className="h-8 w-8" />}
            title="Decentralized Governance"
            description="Vote on proposals and shape the future of Fushuma"
            href="/governance"
          />
          <FeatureCard
            icon={<Rocket className="h-8 w-8" />}
            title="Project Launchpad"
            description="Discover and support new projects seeking funding"
            href="/launchpad"
          />
          <FeatureCard
            icon={<DollarSign className="h-8 w-8" />}
            title="Development Grants"
            description="Apply for or review grant applications"
            href="/grants"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="Community"
            description="Engage with the Fushuma community"
            href="/community"
          />
        </section>

        {/* Stats Section */}
        <section className="grid md:grid-cols-3 gap-8 py-20">
          <StatCard label="Active Proposals" value="12" />
          <StatCard label="Total Grants" value="45" />
          <StatCard label="Community Members" value="1,234" />
        </section>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-8 rounded-lg border border-border bg-card">
      <div className="text-4xl font-bold text-primary mb-2">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

