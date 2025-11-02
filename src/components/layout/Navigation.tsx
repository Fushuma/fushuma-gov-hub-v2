'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTheme } from 'next-themes';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { 
    label: 'Governance',
    items: [
      { href: '/governance', label: 'Proposals' },
      { href: '/grants', label: 'Grants' },
    ]
  },
  { 
    label: 'DeFi',
    items: [
      { href: '/defi/fumaswap/swap', label: 'Swap' },
      { href: '/defi/fumaswap/liquidity', label: 'Liquidity' },
      { href: '/defi/fumaswap/pools', label: 'Pools' },
      { href: '/defi/fumaswap/positions', label: 'Positions' },
    ]
  },
  { href: '/launchpad', label: 'Launchpad' },
  { href: '/docs', label: 'Docs' },
  { href: '/news', label: 'News' },
  { href: '/ecosystem', label: 'Ecosystem' },
  { href: '/community', label: 'Taishi Program' },
];

export function Navigation() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/fushuma-logo.png" alt="Fushuma" className="h-8" />
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                if ('items' in link) {
                  return (
                    <div 
                      key={link.label}
                      className="relative"
                      onClick={() => setOpenDropdown(openDropdown === link.label ? null : link.label)}
                    >
                      <button className="text-sm font-medium transition-colors hover:text-foreground text-muted-foreground">
                        {link.label}
                      </button>
                      {openDropdown === link.label && link.items && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg py-2 z-50">
                          {link.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "block px-4 py-2 text-sm transition-colors hover:bg-accent",
                                pathname === item.href
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground"
                              )}
                              onClick={() => setOpenDropdown(null)}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-foreground",
                      pathname === link.href
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <ConnectButton showBalance={false} chainStatus="icon" />
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-border">
            {navLinks.map((link) => {
              if ('items' in link) {
                return (
                  <div key={link.label} className="space-y-1">
                    <div className="py-2 text-sm font-semibold text-foreground">{link.label}</div>
                    {link.items?.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "block py-2 pl-4 text-sm font-medium transition-colors",
                          pathname === item.href
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "block py-2 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-4">
              <ConnectButton showBalance={false} chainStatus="icon" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

