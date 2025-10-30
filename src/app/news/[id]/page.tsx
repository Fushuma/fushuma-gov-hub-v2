"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, ExternalLink, Tag } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const newsId = parseInt(params.id as string);

  const { data: newsItem, isLoading } = trpc.news.getById.useQuery({ id: newsId });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">News Article Not Found</h1>
          <Button onClick={() => router.push("/news")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to News
          </Button>
        </div>
      </div>
    );
  }

  const sourceColors: Record<string, string> = {
    official: "bg-blue-500",
    telegram: "bg-sky-500",
    github: "bg-purple-500",
    partner: "bg-green-500",
    community: "bg-orange-500",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push("/news")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to News
        </Button>

        {/* Article Card */}
        <Card>
          <CardHeader>
            {/* Source and Category Badges */}
            <div className="flex gap-2 mb-4">
              <Badge className={sourceColors[newsItem.source] || "bg-gray-500"}>
                {newsItem.source}
              </Badge>
              {newsItem.category && (
                <Badge variant="outline">
                  <Tag className="mr-1 h-3 w-3" />
                  {newsItem.category}
                </Badge>
              )}
            </div>

            {/* Title */}
            <CardTitle className="text-3xl font-bold mb-4">
              {newsItem.title}
            </CardTitle>

            {/* Date */}
            <div className="flex items-center text-muted-foreground text-sm">
              <Calendar className="mr-2 h-4 w-4" />
              {format(new Date(newsItem.publishedAt), "MMMM dd, yyyy")}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Featured Image */}
            {newsItem.imageUrl && (
              <div className="relative w-full h-96 rounded-lg overflow-hidden">
                <Image
                  src={newsItem.imageUrl}
                  alt={newsItem.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Full Content */}
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-base leading-relaxed">
                {newsItem.content || newsItem.excerpt}
              </div>
            </div>

            {/* Source Link */}
            {newsItem.sourceUrl && (
              <div className="pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => newsItem.sourceUrl && window.open(newsItem.sourceUrl, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Original Source
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
