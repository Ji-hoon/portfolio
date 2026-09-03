import type { NextConfig } from "next";

// Absent env must not crash config evaluation (lint and other tooling load this
// file without .env.local); page rendering fails loudly via lib/supabase.ts instead.
const supabaseUrl = process.env.SUPABASE_URL;

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    // Shared by the lib/content.ts accessors and lib/hydrate.ts. `expire` (3d)
    // must stay well under the 7-day signed-URL TTL in lib/content.ts so cached
    // entries always hold URLs with days of validity remaining.
    work: {
      stale: 300, // 5 minutes
      revalidate: 60 * 60 * 24, // 1 day
      expire: 60 * 60 * 24 * 3, // 3 days
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      ...(supabaseUrl
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(supabaseUrl).hostname,
              pathname: "/storage/v1/object/sign/**",
              // `search` deliberately omitted: the signed token query rotates.
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
