// Uploads work images from the gitignored asset-src/assets/{id}/ staging tree
// to the private Supabase Storage bucket at {id}/{name}.
// Usage: npm run upload-assets   (reads .env.local; idempotent via upsert)
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { StorageClient } from "@supabase/storage-js";

const must = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing env var ${name} (run via: node --env-file=.env.local scripts/upload-assets.mjs)`,
    );
  }
  return value;
};

const SRC_ROOT = join(process.cwd(), "asset-src", "assets");
const bucketName = must("SUPABASE_ASSETS_BUCKET");
const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY");
const storage = new StorageClient(`${must("SUPABASE_URL")}/storage/v1`, {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
});

const { data: bucket } = await storage.getBucket(bucketName);
if (!bucket) {
  const { error } = await storage.createBucket(bucketName, {
    public: false,
  });
  if (error) throw new Error(`createBucket failed: ${error.message}`);
  console.log(`created private bucket "${bucketName}"`);
} else if (bucket.public) {
  throw new Error(
    `Bucket "${bucketName}" is PUBLIC — make it private before uploading.`,
  );
}

const ids = readdirSync(SRC_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

let count = 0;
for (const id of ids) {
  // Top-level files only: skips png/, _old/ subfolders and .DS_Store.
  const files = readdirSync(join(SRC_ROOT, id), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && extname(entry.name).toLowerCase() === ".webp",
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const name of files) {
    const { error } = await storage
      .from(bucketName)
      .upload(`${id}/${name}`, readFileSync(join(SRC_ROOT, id, name)), {
        contentType: "image/webp", // storage-js defaults to text/plain
        upsert: true,
        cacheControl: "31536000",
      });
    if (error) throw new Error(`upload ${id}/${name} failed: ${error.message}`);
    console.log(`uploaded ${id}/${name}`);
    count++;
  }
}
console.log(`done: ${count} files`);
