'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, UserPlus, Loader2, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import Link from 'next/link';

export default function RegisterDelegatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const registerMutation = trpc.delegates.register.useMutation({
    onSuccess: (data) => {
      if (data.updated) {
        toast.success('Delegate profile updated successfully!');
      } else {
        toast.success('Registered as delegate successfully!');
      }
      router.push('/governance/delegates');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to register as delegate');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    registerMutation.mutate({
      name: name.trim(),
      bio: bio.trim() || undefined,
      twitterHandle: twitterHandle.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16 max-w-2xl">
          <Card>
            <CardContent className="py-12 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-4">
                Please connect your wallet to register as a delegate.
              </p>
              <Link href="/governance/delegates">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Delegates
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/governance/delegates">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Delegates
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-2">Become a Delegate</h1>
          <p className="text-muted-foreground">
            Register to receive voting power delegations from the community
          </p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Delegate Profile</CardTitle>
            <CardDescription>
              Create your delegate profile to start receiving delegations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address">Wallet Address</Label>
                <Input
                  id="address"
                  value={address || ''}
                  disabled
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This address will receive delegations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your name or alias"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell the community about yourself and your governance philosophy..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/1000 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter Handle</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm">
                    @
                  </span>
                  <Input
                    id="twitter"
                    placeholder="username"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                    className="rounded-l-none"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  maxLength={500}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={registerMutation.isPending || !name.trim()}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register as Delegate
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">What it means to be a delegate:</h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>You agree to actively participate in governance decisions</li>
              <li>You will vote on behalf of those who delegate to you</li>
              <li>Your voting history will be publicly visible</li>
              <li>You should communicate your positions on important proposals</li>
              <li>Delegators trust you to represent their interests</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
