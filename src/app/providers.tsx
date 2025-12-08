'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, getTRPCClient } from '@/lib/trpc/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import WalletProvider with SSR disabled to prevent indexedDB errors
const WalletProvider = dynamic(
  () => import('@/components/providers/WalletProvider').then((mod) => mod.WalletProvider),
  { ssr: false }
);

// Dynamically import AuthProvider (depends on WalletProvider hooks)
const AuthProvider = dynamic(
  () => import('@/components/providers/AuthProvider').then((mod) => mod.AuthProvider),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() => getTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </AuthProvider>
        </WalletProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
