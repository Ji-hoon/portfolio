import "server-only";

import { StorageClient } from "@supabase/storage-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy env.sample to .env.local and fill in ` +
        `the Supabase values. These are also required at BUILD time (pages prerender ` +
        `against Supabase Storage) — set them in Vercel project settings for deploys.`,
    );
  }
  return value;
}

let client: StorageClient | null = null;

/**
 * Storage API for the private assets bucket. Server-only; lazy so importing
 * this module never throws — first use does, with setup instructions.
 * StorageClient (not the full supabase-js client) because storage is all we
 * use and supabase-js pulls in realtime-js, which needs a WebSocket global.
 */
export function getAssetsBucket() {
  if (!client) {
    const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    client = new StorageClient(`${requireEnv("SUPABASE_URL")}/storage/v1`, {
      apikey: key,
      Authorization: `Bearer ${key}`,
    });
  }
  return client.from(requireEnv("SUPABASE_ASSETS_BUCKET"));
}
