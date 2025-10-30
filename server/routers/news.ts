import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

// This is a placeholder for the actual implementation
const mockNews = [
  {
    id: 1,
    title: 'Fushuma V2 is Live!',
    source: 'Telegram',
    date: '2025-10-29',
    url: 'https://t.me/fushuma/123',
  },
  {
    id: 2,
    title: 'New Grant Approved: Fushuma DEX Aggregator',
    source: 'GitHub',
    date: '2025-10-28',
    url: 'https://github.com/Fushuma/grants/issues/12',
  },
  {
    id: 3,
    title: 'Community Call: Fushuma V2 and Beyond',
    source: 'Telegram',
    date: '2025-10-27',
    url: 'https://t.me/fushuma/120',
  },
];

export const newsRouter = router({
  listNews: publicProcedure.query(async () => {
    // In a real application, you would fetch this data from Telegram and GitHub
    return mockNews;
  }),
});
