import type { Metadata } from 'next';
import { Expletus_Sans, Noto_Sans } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const expletusSans = Expletus_Sans({ 
  subsets: ['latin'],
  variable: '--font-expletus',
  weight: ['400', '500', '600', '700'],
});

const notoSans = Noto_Sans({ 
  subsets: ['latin'],
  variable: '--font-noto',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Fushuma Governance Hub',
  description: 'The nexus for community interaction, governance, and economic activity in the Fushuma ecosystem',
  keywords: ['Fushuma', 'Governance', 'DeFi', 'Blockchain', 'Web3', 'DAO'],
  authors: [{ name: 'Fushuma Community' }],
  openGraph: {
    title: 'Fushuma Governance Hub',
    description: 'The nexus for community interaction, governance, and economic activity',
    url: 'https://governance.fushuma.com',
    siteName: 'Fushuma Governance Hub',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fushuma Governance Hub',
    description: 'The nexus for community interaction, governance, and economic activity',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${notoSans.variable} ${expletusSans.variable} font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

