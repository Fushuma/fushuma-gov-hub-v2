'use client';

import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

export default function NewsPage() {
  const { data: newsItems, isLoading } = trpc.news.list.useQuery({
    limit: 20,
    offset: 0,
  });

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'official':
        return 'bg-blue-500';
      case 'telegram':
        return 'bg-sky-500';
      case 'github':
        return 'bg-purple-500';
      case 'partner':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">News & Updates</h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest news and announcements from Fushuma
          </p>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading news...</p>
          </div>
        )}

        {!isLoading && newsItems && newsItems.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No news items found</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && newsItems && newsItems.length > 0 && (
          <div className="space-y-6">
            {newsItems.map((newsItem) => {
              const imageUrl = newsItem.imageUrl;
              
              return (
                <Card key={newsItem.id} className="overflow-hidden">
                  <div className="md:flex">
                    {imageUrl && (
                      <div className="md:w-1/3 relative h-64 md:h-auto">
                        <Image
                          src={imageUrl}
                          alt={newsItem.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className={imageUrl ? 'md:w-2/3' : 'w-full'}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getSourceBadgeColor(newsItem.source)}>
                                {newsItem.source}
                              </Badge>
                              {newsItem.category && (
                                <Badge variant="outline">{newsItem.category}</Badge>
                              )}
                            </div>
                            <CardTitle className="text-2xl mb-2">
                              {newsItem.title}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{format(new Date(newsItem.publishedAt), 'MMMM dd, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none mb-4">
                          {newsItem.excerpt ? (
                            <p className="text-muted-foreground">{newsItem.excerpt}</p>
                          ) : newsItem.content ? (
                            <p className="text-muted-foreground line-clamp-3">
                              {newsItem.content.substring(0, 200)}...
                            </p>
                          ) : null}
                        </div>

                        {newsItem.sourceUrl && (
                          <Link href={newsItem.sourceUrl} target="_blank">
                            <Button variant="outline" className="gap-2">
                              View Source <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
