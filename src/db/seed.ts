import { db } from './index';
import { proposals, developmentGrants, newsFeed, users } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create a test user
    const [testUser] = await db.insert(users).values({
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      username: 'testuser',
      displayName: 'Test User',
      role: 'user',
    }).$returningId();

    console.log('✅ Created test user');

    // Seed proposals
    const proposalsData = [
      {
        title: 'Protocol Upgrade: Fushuma V2',
        description: 'This proposal outlines the upgrade to Fushuma V2, which includes a new fee structure, improved governance module, and enhanced security features. The upgrade will bring significant improvements to the network including:\n\n- Reduced transaction fees by 50%\n- Enhanced governance voting mechanisms\n- Improved smart contract security\n- Better scalability for future growth',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'active' as const,
        quorum: 1000,
        votesFor: 1234567,
        votesAgainst: 12345,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Community Treasury Allocation: Q4 2025',
        description: 'A proposal to allocate 1,000,000 FUMA from the community treasury to fund various community initiatives in Q4 2025. The allocation will be distributed across:\n\n- Developer grants: 500,000 FUMA\n- Marketing initiatives: 250,000 FUMA\n- Community events: 150,000 FUMA\n- Infrastructure improvements: 100,000 FUMA',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'pending' as const,
        quorum: 1000,
        votesFor: 123456,
        votesAgainst: 765432,
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Implement Cross-Chain Bridge',
        description: 'Proposal to develop and deploy a cross-chain bridge connecting Fushuma to Ethereum, BSC, and Polygon networks. This will enable seamless asset transfers and increase ecosystem interoperability.',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'passed' as const,
        quorum: 1000,
        votesFor: 987654,
        votesAgainst: 54321,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    ];

    await db.insert(proposals).values(proposalsData);
    console.log('✅ Seeded proposals');

    // Seed grants
    const grantsData = [
      {
        title: 'Fushuma DEX Aggregator',
        applicantName: 'DeFi Builders Team',
        contactInfo: 'team@defibuilders.com',
        description: 'A comprehensive DEX aggregator that will provide users with the best rates across all Fushuma DEXs. The aggregator will integrate with PancakeSwap V4, Uniswap V3, and other major DEXs on Fushuma.',
        valueProposition: 'Users will save an average of 3-5% on swaps by automatically routing through the best liquidity sources. This will increase overall trading volume on Fushuma and improve user experience.',
        deliverables: '- Smart contracts for aggregation logic\n- Frontend web application\n- API for third-party integrations\n- Comprehensive documentation',
        roadmap: 'Month 1: Smart contract development\nMonth 2: Frontend development\nMonth 3: Testing and security audit\nMonth 4: Mainnet deployment',
        fundingRequest: 50000,
        receivingWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        submittedBy: testUser.id,
        status: 'approved' as const,
      },
      {
        title: 'Fushuma NFT Marketplace',
        applicantName: 'NFT Innovators',
        contactInfo: '@nftinnovators',
        description: 'A feature-rich NFT marketplace on Fushuma, supporting multiple collections and providing a seamless user experience for creators and collectors.',
        valueProposition: 'Will attract NFT creators and collectors to Fushuma ecosystem, increasing network activity and token utility.',
        deliverables: '- NFT marketplace smart contracts\n- Web application for browsing and trading\n- Creator tools and analytics\n- Mobile-responsive design',
        roadmap: 'Q1 2026: Smart contract development\nQ2 2026: Frontend and backend\nQ3 2026: Beta testing\nQ4 2026: Full launch',
        fundingRequest: 75000,
        submittedBy: testUser.id,
        status: 'review' as const,
      },
      {
        title: 'Fushuma Mobile Wallet',
        applicantName: 'Mobile First Labs',
        contactInfo: 'hello@mobilefirstlabs.io',
        description: 'A native mobile wallet for Fushuma with a focus on security and ease of use. Will support iOS and Android platforms.',
        valueProposition: 'Makes Fushuma accessible to mobile users, expanding the potential user base significantly.',
        deliverables: '- iOS application\n- Android application\n- Biometric authentication\n- WalletConnect integration\n- In-app DEX integration',
        roadmap: 'Month 1-2: Design and architecture\nMonth 3-4: iOS development\nMonth 5-6: Android development\nMonth 7: Testing and security audit\nMonth 8: App store deployment',
        fundingRequest: 100000,
        submittedBy: testUser.id,
        status: 'submitted' as const,
      },
    ];

    await db.insert(developmentGrants).values(grantsData);
    console.log('✅ Seeded grants');

    // Seed news
    const newsData = [
      {
        title: 'Fushuma Governance Hub V2 is Live!',
        content: 'We are excited to announce the launch of Fushuma Governance Hub V2, featuring a completely redesigned interface, improved voting mechanisms, and seamless integration with our DeFi ecosystem.',
        excerpt: 'The new governance hub brings major improvements to the Fushuma ecosystem.',
        source: 'telegram' as const,
        category: 'announcement',
        sourceUrl: 'https://t.me/fushuma',
        publishedAt: new Date(),
      },
      {
        title: 'New Development Grant Approved: DEX Aggregator',
        content: 'The community has approved a 50,000 FUMA grant for the development of a DEX aggregator that will provide users with the best swap rates across all Fushuma DEXs.',
        excerpt: 'DeFi Builders Team receives funding to build DEX aggregator.',
        source: 'github' as const,
        category: 'grants',
        sourceUrl: 'https://github.com/Fushuma/Dev_grants',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Community Call: Fushuma V2 Roadmap Discussion',
        content: 'Join us for a community call to discuss the Fushuma V2 roadmap, upcoming features, and answer your questions about the future of the network.',
        excerpt: 'Monthly community call scheduled for next week.',
        source: 'community' as const,
        category: 'community',
        sourceUrl: 'https://discord.gg/fushuma',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'PancakeSwap V4 Integration Complete',
        content: 'Fushuma has successfully integrated PancakeSwap V4, bringing advanced DeFi features and improved liquidity to the ecosystem.',
        excerpt: 'PancakeSwap V4 now available on Fushuma Network.',
        source: 'official' as const,
        category: 'defi',
        sourceUrl: 'https://twitter.com/FushumaChain',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ];

    await db.insert(newsFeed).values(newsData);
    console.log('✅ Seeded news');

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
