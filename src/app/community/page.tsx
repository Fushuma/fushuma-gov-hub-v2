'use client';

import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Users, 
  Github, 
  Twitter, 
  Send,
  BookOpen,
  Award,
  Lightbulb
} from 'lucide-react';

export default function CommunityPage() {
  const communityLinks = [
    {
      name: 'Discord',
      description: 'Join our Discord server for real-time discussions and community support',
      icon: <MessageSquare className="h-8 w-8" />,
      url: 'https://discord.gg/fushuma',
      color: 'bg-indigo-500',
    },
    {
      name: 'Telegram',
      description: 'Connect with the community on Telegram for announcements and chat',
      icon: <Send className="h-8 w-8" />,
      url: 'https://t.me/fushuma',
      color: 'bg-blue-500',
    },
    {
      name: 'Twitter',
      description: 'Follow us on Twitter for the latest news and updates',
      icon: <Twitter className="h-8 w-8" />,
      url: 'https://twitter.com/FushumaChain',
      color: 'bg-sky-500',
    },
    {
      name: 'GitHub',
      description: 'Contribute to our open-source projects and development grants',
      icon: <Github className="h-8 w-8" />,
      url: 'https://github.com/Fushuma',
      color: 'bg-gray-700',
    },
  ];

  const programs = [
    {
      title: 'Taishi Program',
      description: 'Our ambassador program for community leaders and contributors. Earn rewards by promoting Fushuma and helping grow the ecosystem.',
      icon: <Award className="h-6 w-6" />,
      action: 'Learn More',
      url: '/community/taishi',
    },
    {
      title: 'Developer Grants',
      description: 'Apply for funding to build innovative projects on Fushuma. We support developers with grants up to 100,000 FUMA.',
      icon: <Lightbulb className="h-6 w-6" />,
      action: 'Apply Now',
      url: '/grants/apply',
    },
    {
      title: 'Documentation',
      description: 'Access comprehensive guides, tutorials, and API references to start building on Fushuma.',
      icon: <BookOpen className="h-6 w-6" />,
      action: 'Read Docs',
      url: 'https://docs.fushuma.com',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Join the Fushuma Community</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with developers, investors, and enthusiasts building the future of decentralized governance and finance
          </p>
        </div>

        {/* Community Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {communityLinks.map((link) => (
            <Card key={link.name} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className={`${link.color} w-16 h-16 rounded-lg flex items-center justify-center text-white mb-4`}>
                  {link.icon}
                </div>
                <CardTitle className="text-xl">{link.name}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(link.url, '_blank')}
                >
                  Join {link.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Programs Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Community Programs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {programs.map((program) => (
              <Card key={program.title}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                      {program.icon}
                    </div>
                    <CardTitle className="text-xl">{program.title}</CardTitle>
                  </div>
                  <CardDescription className="min-h-[60px]">
                    {program.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => {
                      if (program.url.startsWith('http')) {
                        window.open(program.url, '_blank');
                      } else {
                        window.location.href = program.url;
                      }
                    }}
                  >
                    {program.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Community Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">10K+</div>
                <div className="text-sm text-muted-foreground">Community Members</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">50+</div>
                <div className="text-sm text-muted-foreground">Active Developers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">25+</div>
                <div className="text-sm text-muted-foreground">Funded Projects</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">$2M+</div>
                <div className="text-sm text-muted-foreground">Grants Distributed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Get Involved Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Get Involved</CardTitle>
            <CardDescription>
              There are many ways to contribute to the Fushuma ecosystem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Participate in Governance</h4>
                  <p className="text-sm text-muted-foreground">
                    Vote on proposals and help shape the future of Fushuma
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Build on Fushuma</h4>
                  <p className="text-sm text-muted-foreground">
                    Create dApps, tools, and services using our developer resources
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Become an Ambassador</h4>
                  <p className="text-sm text-muted-foreground">
                    Join the Taishi Program and earn rewards for community contributions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Github className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Contribute to Open Source</h4>
                  <p className="text-sm text-muted-foreground">
                    Help improve our codebase and documentation on GitHub
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button onClick={() => window.location.href = '/governance'}>
                View Proposals
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/grants/apply'}>
                Apply for Grant
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
