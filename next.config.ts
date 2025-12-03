import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Turbopack configuration (Next.js 16+)
  turbopack: {},
  
  // Output file tracing root
  outputFileTracingRoot: process.cwd(),
  outputFileTracingExcludes: {
    '/**/*': ['**/*.map', '**/*.test.*', '**/node_modules/**'],
  },
  
  // Webpack configuration (for Turbopack compatibility)
  webpack: (config, { isServer }) => {
    // Only apply webpack config if not using Turbopack
    if (process.env.NEXT_BUILD_TOOL !== 'turbopack') {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
    }
    return config;
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Enable Turbopack with proper configuration
    // turbopack: true,
  },
  
  // Server external packages (moved from experimental)
  serverExternalPackages: ['thread-stream', 'pino', 'pino-pretty', 'pino-http'],
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

// Ensure turbopack is properly configured
if (!nextConfig.turbopack) {
  nextConfig.turbopack = {};
}

export default nextConfig;

