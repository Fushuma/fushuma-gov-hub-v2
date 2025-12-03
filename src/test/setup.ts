/**
 * Vitest Test Setup
 *
 * This file runs before each test file and sets up the testing environment.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock wagmi hooks
vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: () => ({
      address: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
    }),
    usePublicClient: () => ({
      readContract: vi.fn(),
      getBlockNumber: vi.fn().mockResolvedValue(1000000n),
      getLogs: vi.fn().mockResolvedValue([]),
      getBlock: vi.fn().mockResolvedValue({ timestamp: BigInt(Date.now() / 1000) }),
    }),
    useWriteContract: () => ({
      writeContract: vi.fn(),
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
    }),
    useReadContract: () => ({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
    }),
  };
});

// Mock window.ethereum
Object.defineProperty(global, 'window', {
  value: {
    ethereum: {
      isMetaMask: true,
      request: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  writable: true,
});

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: An update to') ||
        args[0].includes('act(...)'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
