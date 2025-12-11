'use client';

import { ReactNode, useEffect, useRef, useState, createContext, useContext } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  user: {
    id: number;
    walletAddress: string | null;
    username: string | null;
    displayName: string | null;
    avatar: string | null;
    role: 'user' | 'admin';
  } | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAuthenticating: false,
  user: null,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const hasAttemptedAuth = useRef<string | null>(null);

  // Get current user from server
  const { data: currentUser, refetch: refetchUser } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Mutations
  const getNonceMutation = trpc.auth.getNonce.useMutation();
  const signInMutation = trpc.auth.signIn.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  const isAuthenticated = !!currentUser;

  // Sign in with wallet
  const signIn = async () => {
    if (!address || isAuthenticating) return;

    setIsAuthenticating(true);
    try {
      // Get nonce from server
      const { nonce, message } = await getNonceMutation.mutateAsync({ address });

      // Request signature from user
      const signature = await signMessageAsync({ message });

      // Send signature to server
      const result = await signInMutation.mutateAsync({
        address,
        signature,
        message,
      });

      // Store the JWT token as a cookie
      if (result.token) {
        document.cookie = `fushuma_session=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }

      // Refetch user data
      await refetchUser();

      toast.success('Successfully signed in!');
    } catch (error: any) {
      if (error?.message?.includes('User rejected') || error?.message?.includes('denied')) {
        toast.error('Sign-in cancelled. You need to sign the message to use governance features.');
      } else {
        console.error('Sign-in error:', error);
        toast.error('Failed to sign in. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await logoutMutation.mutateAsync();
      // Clear the session cookie
      document.cookie = 'fushuma_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      await refetchUser();
      disconnect();
      hasAttemptedAuth.current = null;
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  // Auto-authenticate when wallet connects
  useEffect(() => {
    // Only attempt auth if:
    // 1. Wallet is connected
    // 2. Not currently authenticating
    // 3. Not already authenticated
    // 4. Haven't already attempted for this address
    if (
      isConnected &&
      address &&
      !isAuthenticating &&
      !isAuthenticated &&
      hasAttemptedAuth.current !== address
    ) {
      hasAttemptedAuth.current = address;
      signIn();
    }
  }, [isConnected, address, isAuthenticated, isAuthenticating]);

  // Reset auth attempt tracking when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasAttemptedAuth.current = null;
    }
  }, [isConnected]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAuthenticating,
        user: currentUser || null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
