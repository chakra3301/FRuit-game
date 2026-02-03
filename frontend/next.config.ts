import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {
      // Polyfill Node.js modules for Solana wallet adapter
      fs: { browser: './src/lib/empty-module.ts' },
      net: { browser: './src/lib/empty-module.ts' },
      tls: { browser: './src/lib/empty-module.ts' },
      crypto: { browser: './src/lib/empty-module.ts' },
    },
  },

  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Disable strict mode for Matter.js compatibility
  reactStrictMode: false,
};

export default nextConfig;
