import { db } from './index';
import { proposals, developmentGrants, newsFeed, users, votes } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Clear existing test data
    console.log('🧹 Clearing existing test data...');
    
    // Delete votes first (foreign key constraint)
    await db.delete(votes);
    console.log('  ✓ Cleared votes');
    
    // Delete proposals
    await db.delete(proposals);
    console.log('  ✓ Cleared proposals');
    
    // Delete grants
    await db.delete(developmentGrants);
    console.log('  ✓ Cleared grants');
    
    // Delete news
    await db.delete(newsFeed);
    console.log('  ✓ Cleared news');
    
    // Delete test users (keep real users)
    await db.delete(users).where(eq(users.username, 'testuser'));
    console.log('  ✓ Cleared test users');

    // Create a test user
    const [testUser] = await db.insert(users).values({
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      username: 'testuser',
      displayName: 'Test User',
      role: 'user',
    }).$returningId();

    console.log('✅ Created test user');

    // Seed proposals with more diverse data
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
      {
        title: 'Launch Fushuma Launchpad Platform',
        description: 'Proposal to launch an official launchpad platform for new projects on Fushuma. The platform will provide vetting, funding, and marketing support for promising projects. Features include:\n\n- Community voting on project listings\n- Tiered allocation system based on FUMA holdings\n- Anti-bot protection\n- Transparent fundraising process',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'active' as const,
        quorum: 1000,
        votesFor: 456789,
        votesAgainst: 23456,
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Increase Block Gas Limit',
        description: 'Proposal to increase the block gas limit from 30M to 50M to accommodate more complex smart contracts and higher transaction throughput.',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'rejected' as const,
        quorum: 1000,
        votesFor: 234567,
        votesAgainst: 567890,
        startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Establish Fushuma Ecosystem Fund',
        description: 'Create a 5M FUMA ecosystem fund to support strategic partnerships, liquidity incentives, and ecosystem growth initiatives. The fund will be managed by a 5-member committee elected by token holders.',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'active' as const,
        quorum: 1000,
        votesFor: 678901,
        votesAgainst: 123456,
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Integrate Chainlink Price Feeds',
        description: 'Proposal to integrate Chainlink price feeds for accurate on-chain price data. This will enable more sophisticated DeFi protocols and reduce oracle manipulation risks.',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'pending' as const,
        quorum: 1000,
        votesFor: 0,
        votesAgainst: 0,
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Reduce Transaction Fees by 30%',
        description: 'A proposal to reduce network transaction fees by 30% to make Fushuma more competitive and accessible to users. This will be achieved through optimizations in the fee calculation mechanism.',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'active' as const,
        quorum: 1000,
        votesFor: 890123,
        votesAgainst: 45678,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Partnership with Major CEX for FUMA Listing',
        description: 'Proposal to allocate 200,000 FUMA from the treasury to secure a listing on a top-tier centralized exchange, increasing accessibility and liquidity for FUMA token.',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'active' as const,
        quorum: 1000,
        votesFor: 567890,
        votesAgainst: 234567,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Launch Bug Bounty Program',
        description: 'Establish a bug bounty program with a 500,000 FUMA pool to incentivize security researchers to find and report vulnerabilities in Fushuma smart contracts and infrastructure.',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'passed' as const,
        quorum: 1000,
        votesFor: 923456,
        votesAgainst: 34567,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Implement Governance Staking Rewards',
        description: 'Proposal to reward active governance participants with staking rewards. Users who vote on proposals will receive a share of 100,000 FUMA distributed monthly.',
        proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        proposerUserId: testUser.id,
        status: 'active' as const,
        quorum: 1000,
        votesFor: 712345,
        votesAgainst: 156789,
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
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
        description: 'A comprehensive DEX aggregator that will provide users with the best rates across all Fushuma DEXs. The aggregator will integrate with FumaSwap V4, Uniswap V3, and other major DEXs on Fushuma.',
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
        title: 'FumaSwap V4 Integration Complete',
        content: 'Fushuma has successfully integrated FumaSwap V4, bringing advanced DeFi features and improved liquidity to the ecosystem.',
        excerpt: 'FumaSwap V4 now available on Fushuma Network.',
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
