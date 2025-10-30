'use client';

import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

export default function NewsPage() {
  const { data: news, isLoading, error } = trpc.news.list.useQuery({
    limit: 20,
    offset: 0,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">News & Updates</h1>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-300 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-red-500">Failed to load news: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && news && news.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="text-xl font-semibold mb-2">No News Yet</h3>
              <p className="text-muted-foreground">
                Check back later for the latest updates from the Fushuma community.
              </p>
            </CardContent>
          </Card>
        )}

        {/* News List */}
        {!isLoading && !error && news && news.length > 0 && (
          <div className="space-y-6">
            {news.map((newsItem) => (
              <NewsCard key={newsItem.id} newsItem={newsItem} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function NewsCard({ newsItem }: { newsItem: any }) {
  const getSourceClass = (source: string) => {
    switch (source.toLowerCase()) {
      case "telegram":
        return "bg-blue-500";
      case "github":
        return "bg-gray-800";
      case "twitter":
        return "bg-sky-500";
      case "discord":
        return "bg-indigo-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-2xl font-bold">{newsItem.title}</CardTitle>
          <Badge className={getSourceClass(newsItem.source)}>{newsItem.source}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {format(new Date(newsItem.publishedAt), 'MMMM dd, yyyy')}
          </div>
          <Link href={newsItem.sourceUrl || '#'} target="_blank">
            <Button variant="outline" className="gap-2">
              View Source <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
