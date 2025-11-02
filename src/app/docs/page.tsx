import { Metadata } from 'next';
import Link from 'next/link';
import { 
  BookOpen, 
  Vote, 
  DollarSign, 
  Rocket, 
  TrendingUp, 
  Users, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documentation | Fushuma Hub',
  description: 'Learn how to use all features of the Fushuma ecosystem.',
};

const docSections = [
  {
    title: 'Getting Started',
    description: 'Set up your wallet and get your first FUMA tokens.',
    icon: BookOpen,
    href: '/docs/getting-started',
    color: 'text-blue-500',
  },
  {
    title: 'Governance',
    description: 'Vote on proposals and shape the future of Fushuma.',
    icon: Vote,
    href: '/docs/governance',
    color: 'text-purple-500',
  },
  {
    title: 'Grants',
    description: 'Apply for funding from the community treasury.',
    icon: DollarSign,
    href: '/docs/grants',
    color: 'text-green-500',
  },
  {
    title: 'Launchpad',
    description: 'Launch your project or invest in new tokens.',
    icon: Rocket,
    href: '/docs/launchpad',
    color: 'text-orange-500',
  },
  {
    title: 'DeFi (FumaSwap)',
    description: 'Trade tokens and provide liquidity on FumaSwap.',
    icon: TrendingUp,
    href: '/docs/defi',
    color: 'text-cyan-500',
  },
  {
    title: 'Taishi Program',
    description: 'Become a community leader and earn rewards.',
    icon: Users,
    href: '/docs/taishi',
    color: 'text-pink-500',
  },
];

export default function DocsIndexPage() {
  return (
    <article>
      <div className="mb-12">
        <h1 className="text-5xl font-bold mb-4">Documentation</h1>
        <p className="text-xl text-muted-foreground">
          Welcome to the Fushuma Hub documentation. Learn how to use all the features of the Fushuma ecosystem.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {docSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group p-6 rounded-lg border border-border bg-card hover:bg-accent transition-all hover:shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className={`${section.color} mt-1`}>
                <section.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {section.description}
                </p>
                <div className="flex items-center text-sm text-primary">
                  Learn more
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link
          href="/docs/faq"
          className="group p-6 rounded-lg border border-border bg-card hover:bg-accent transition-all"
        >
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">FAQ</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Find answers to frequently asked questions about the Fushuma ecosystem.
          </p>
        </Link>

        <Link
          href="/docs/glossary"
          className="group p-6 rounded-lg border border-border bg-card hover:bg-accent transition-all"
        >
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold">Glossary</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Learn the terminology used in the Fushuma ecosystem and DeFi.
          </p>
        </Link>
      </div>
    </article>
  );
}
