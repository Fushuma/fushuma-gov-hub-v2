import { Navigation } from '@/components/layout/Navigation';

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Taishi Program</h1>
        {/* Community content will go here */}
      </main>
    </div>
  );
}
