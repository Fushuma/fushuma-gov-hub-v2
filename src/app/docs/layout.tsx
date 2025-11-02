'use client';

import { Navigation } from '@/components/layout/Navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  Vote, 
  DollarSign, 
  Rocket, 
  TrendingUp, 
  Users, 
  HelpCircle,
  BookMarked
} from 'lucide-react';

const docSections = [
  {
    title: 'Getting Started',
    icon: BookOpen,
    items: [
      { href: '/docs/getting-started', label: 'Introduction' },
      { href: '/docs/getting-started/wallet-setup', label: 'Wallet Setup' },
      { href: '/docs/getting-started/getting-fuma', label: 'Getting FUMA' },
    ],
  },
  {
    title: 'Governance',
    icon: Vote,
    items: [
      { href: '/docs/governance', label: 'Overview' },
      { href: '/docs/governance/voting', label: 'How to Vote' },
      { href: '/docs/governance/proposals', label: 'Creating Proposals' },
    ],
  },
  {
    title: 'Grants',
    icon: DollarSign,
    items: [
      { href: '/docs/grants', label: 'Overview' },
      { href: '/docs/grants/applying', label: 'How to Apply' },
      { href: '/docs/grants/review-process', label: 'Review Process' },
    ],
  },
  {
    title: 'Launchpad',
    icon: Rocket,
    items: [
      { href: '/docs/launchpad', label: 'Overview' },
      { href: '/docs/launchpad/launching', label: 'Launching an ICO' },
      { href: '/docs/launchpad/participating', label: 'Participating in ICOs' },
    ],
  },
  {
    title: 'DeFi (FumaSwap)',
    icon: TrendingUp,
    items: [
      { href: '/docs/defi', label: 'Overview' },
      { href: '/docs/defi/swapping', label: 'Swapping Tokens' },
      { href: '/docs/defi/liquidity', label: 'Providing Liquidity' },
      { href: '/docs/defi/positions', label: 'Managing Positions' },
    ],
  },
  {
    title: 'Taishi Program',
    icon: Users,
    items: [
      { href: '/docs/taishi', label: 'Overview' },
      { href: '/docs/taishi/applying', label: 'How to Apply' },
      { href: '/docs/taishi/responsibilities', label: 'Responsibilities' },
    ],
  },
  {
    title: 'Help',
    icon: HelpCircle,
    items: [
      { href: '/docs/faq', label: 'FAQ' },
      { href: '/docs/glossary', label: 'Glossary' },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-20 space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <BookMarked className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Documentation</h2>
              </div>
              
              {docSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                    <section.icon className="h-4 w-4" />
                    {section.title}
                  </div>
                  <div className="space-y-1 pl-6 border-l border-border">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "block py-1.5 px-3 text-sm rounded-md transition-colors",
                          pathname === item.href
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
