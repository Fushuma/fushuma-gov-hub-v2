'use client';

import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Award,
  Users,
  TrendingUp,
  Globe,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

export default function TaishiProgramPage() {
  const roles = [
    {
      name: 'Samourai',
      reward: '$35/month',
      requirements: 'Minimum 4 CPs per month',
      description: 'Occasionally share Fushuma-related content to build awareness.',
      examples: [
        'Tweet highlighting a Fushuma feature = 1 CP',
        'Instagram story sharing Fushuma updates = 1 CP',
        'Sharing Fushuma news in a Telegram group = 1 CP',
        'Creating a meme related to Fushuma = 1 CP',
      ],
    },
    {
      name: 'Ronin',
      reward: '$100/month',
      requirements: 'Minimum 10 CPs per month with visible engagement',
      description: 'Actively promote Fushuma with high-quality content that generates engagement.',
      examples: [
        'Twitter thread (5-10 tweets) explaining governance = 3 CPs',
        'Medium article (600-800 words) on tokenomics = 4 CPs',
        '10-minute YouTube video on latest updates = 5 CPs',
        'Infographic on Fushuma ecosystem = 3 CPs',
      ],
    },
    {
      name: 'Daimyo',
      reward: '$200/month',
      requirements: 'Minimum 10 CPs per month + one original article',
      description: 'Consistent outreach and creation of educational content about Fushuma features and dApps.',
      eligibility: 'After 2+ months as a Ronin',
      examples: [
        'Detailed staking guide (1200+ words) = 6 CPs',
        'Hosting a 30-minute AMA session = 5 CPs',
        'Translating Fushuma whitepaper = 4 CPs',
      ],
    },
    {
      name: 'Taishi',
      reward: '$500/month',
      requirements: 'Minimum 10 CPs per month + article + quarterly initiative',
      description: 'Maintain Daimyo-level output and lead at least one regional initiative or partnership activity per quarter.',
      eligibility: 'After 3+ months as a Daimyo',
      examples: [
        'Organizing a local meetup = 6 CPs',
        'Establishing collaboration with local exchange = 8 CPs',
        'Publishing monthly community growth report = 4 CPs',
      ],
    },
  ];

  const missionAreas = [
    {
      title: 'Community Engagement',
      description: 'Launch or join community-driven campaigns (#Fushuma, #BlockchainForThePeople, #Taishi) to encourage discussion.',
      icon: <Users className="h-6 w-6" />,
    },
    {
      title: 'Content Creation',
      description: 'Create informative posts, articles, graphics, or short videos highlighting Fushuma\'s mission and values.',
      icon: <Lightbulb className="h-6 w-6" />,
    },
    {
      title: 'Memes & GIFs',
      description: 'Communicate Fushuma\'s values in a fun, engaging way. Well-suited to platforms such as X, Instagram, and YouTube.',
      icon: <TrendingUp className="h-6 w-6" />,
    },
    {
      title: 'Educational Content',
      description: 'Help users understand Fushuma by turning advanced concepts into simple explanations.',
      icon: <Award className="h-6 w-6" />,
    },
    {
      title: 'Events & AMAs',
      description: 'Host online events (Twitter Spaces, etc) or real-life meetups to promote Fushuma and engage with new audiences.',
      icon: <Users className="h-6 w-6" />,
    },
    {
      title: 'Translations',
      description: 'Translate announcements, guides, or posts to make Fushuma accessible to a global audience.',
      icon: <Globe className="h-6 w-6" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="outline">Ambassador Program</Badge>
          <h1 className="text-5xl font-bold mb-4">Taishi Program</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Fushuma Ambassador Program - An open invitation to content creators and advocates
          </p>
        </div>

        {/* Mission Statement */}
        <Card className="mb-12">
          <CardContent className="pt-6">
            <div className="prose prose-lg max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                Fushuma was founded on the conviction that power should belong to the people. From the beginning, our goal has been to create a structure that enables proactive community members to engage meaningfully in building and contributing to the ecosystem.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To advance this vision, we've been developing a model of decentralized collaboration that is inclusive, cost-efficient, and transparent.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                The <strong>Taishi program</strong> is an open invitation to content creators and advocates. It provides a framework where community members can contribute through content creation, advocacy, and community outreach while earning rewards.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mission Areas */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Taishi Mission Areas</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            These are key ways Taishi members can support the ecosystem. This list isn't exhaustive, and any contribution that adds value to Fushuma is encouraged.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {missionAreas.map((area) => (
              <Card key={area.title}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                      {area.icon}
                    </div>
                    <CardTitle className="text-lg">{area.title}</CardTitle>
                  </div>
                  <CardDescription>{area.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Roles & Requirements */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Roles & Requirements</h2>
          <div className="space-y-6">
            {roles.map((role, index) => (
              <Card key={role.name} className={index === roles.length - 1 ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-2xl">{role.name}</CardTitle>
                        <Badge variant="outline" className="text-lg">{role.reward}</Badge>
                      </div>
                      {role.eligibility && (
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Eligibility:</strong> {role.eligibility}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Requirements:</strong> {role.requirements}
                      </p>
                      <p className="text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">Examples of Contributions:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {role.examples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Referral Program */}
        <Card className="mb-12 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl">Referral Program</CardTitle>
            <CardDescription>
              A referral system is available for all Taishi members to support Fushuma's growth and reward community-driven promotion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Each Taishi can generate a personal referral link to include in their content. When someone uses this link:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
              <li>The <strong>referred user</strong> receives a <strong>5% bonus</strong> on their purchase.</li>
              <li>The <strong>referrer (Taishi)</strong> earns <strong>2.5% of the purchase value in USDT</strong>.</li>
            </ul>
            <p className="text-muted-foreground">
              By welcoming new users on better terms, Taishi members actively strengthen the treasury, grow the community, and reinforce Fushuma's long-term resilience.
            </p>
          </CardContent>
        </Card>

        {/* Tips for Success */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Tips for Success</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span className="text-muted-foreground"><strong>Be original and clear:</strong> Content should reflect your view and understanding of Fushuma.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span className="text-muted-foreground"><strong>Translate with care:</strong> Use culturally appropriate language and retain technical terms (staking, bonding curve) in English for consistency.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span className="text-muted-foreground"><strong>Cite and link properly:</strong> When referencing articles, FIPs, features, or any resources, always link to the source.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span className="text-muted-foreground"><strong>You represent Fushuma:</strong> Refrain from spammy behavior or misinformation across platforms.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span className="text-muted-foreground"><strong>No AI-generated content:</strong> Using AI to generate posts or articles is prohibited. Violations will result in a warning, followed by removal from the Taishi program.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Application Process */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Application Process</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">1.</span>
                <span className="text-muted-foreground"><strong>Create and share content</strong> about Fushuma over 1 month.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">2.</span>
                <span className="text-muted-foreground"><strong>Submit your content</strong> and social profiles using the dedicated Github thread.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">3.</span>
                <span className="text-muted-foreground"><strong>Share why you support Fushuma</strong> and how you plan to contribute.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">4.</span>
                <span className="text-muted-foreground"><strong>Provide your wallet address</strong> to receive your rewards.</span>
              </li>
            </ol>
            <p className="text-muted-foreground mb-6">
              Successful applicants will be announced on Fushuma's social channels and GitHub, then onboarded as Samurai.
            </p>
            <Button size="lg" onClick={() => window.location.href = '/community/apply'}>
              Apply Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Important Note */}
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Important:</strong> Each ambassador must submit a monthly report on Github documenting contributions by the 5th calendar day of the month. Missing reports for two consecutive months result in removal from the program.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
