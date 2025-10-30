import { Navigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const mockNews = [
  {
    id: 1,
    title: "Fushuma V2 is Live!",
    source: "Telegram",
    date: "2025-10-29",
    url: "https://t.me/fushuma/123",
  },
  {
    id: 2,
    title: "New Grant Approved: Fushuma DEX Aggregator",
    source: "GitHub",
    date: "2025-10-28",
    url: "https://github.com/Fushuma/grants/issues/12",
  },
  {
    id: 3,
    title: "Community Call: Fushuma V2 and Beyond",
    source: "Telegram",
    date: "2025-10-27",
    url: "https://t.me/fushuma/120",
  },
];

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">News & Updates</h1>
        <div className="space-y-6">
          {[...mockNews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((newsItem) => (
            <NewsCard key={newsItem.id} newsItem={newsItem} />
          ))}
        </div>
      </main>
    </div>
  );
}

function NewsCard({ newsItem }: { newsItem: any }) {
  const getSourceClass = (source: string) => {
    switch (source) {
      case "Telegram":
        return "bg-blue-500";
      case "GitHub":
        return "bg-gray-800";
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
            {new Date(newsItem.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <Link href={newsItem.url} target="_blank">
            <Button variant="outline" className="gap-2">
              View Source <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
