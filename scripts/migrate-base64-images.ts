import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import * as dotenv from "dotenv";
import { pool } from "../src/db/index.ts";

dotenv.config();

type StoredImage = {
  url?: string;
  webp_url?: string;
  source_type?: string;
  alt_ar?: string;
  alt_fr?: string;
  alt_en?: string;
  sort_order?: number;
  [key: string]: unknown;
};

function detectExtension(mime: string, bytes: Buffer): string | null {
  if (mime === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (mime === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (mime === "image/webp" && bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

async function main() {
  if (!process.env.UPLOADS_DIR?.trim()) {
    throw new Error("Set UPLOADS_DIR to a mounted persistent directory before migrating legacy images.");
  }
  const uploadDirectory = path.resolve(process.env.UPLOADS_DIR);
  const publicDir = path.resolve(process.cwd(), "public");
  const distDir = path.resolve(process.cwd(), "dist");
  const isWithin = (parent: string, child: string) => {
    const rel = path.relative(parent, child);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  };
  if (isWithin(publicDir, uploadDirectory) || isWithin(distDir, uploadDirectory)) {
    throw new Error("UPLOADS_DIR must be outside public/ and dist/.");
  }
  await fs.mkdir(uploadDirectory, { recursive: true });
  const { rows } = await pool.query<{ id: string; images: StoredImage[] }>(
    "SELECT id, images FROM products WHERE jsonb_typeof(images) = 'array'"
  );

  let moved = 0;
  let skipped = 0;
  for (const row of rows) {
    let changed = false;
    const images = Array.isArray(row.images) ? row.images.map((image) => ({ ...image })) : [];
    for (const image of images) {
      if (typeof image.url !== "string" || !image.url.startsWith("data:image/")) continue;
      const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image.url);
      if (!match) {
        skipped += 1;
        console.warn(`Skipped unsupported legacy image in product ${row.id}`);
        continue;
      }
      const mime = match[1];
      const bytes = Buffer.from(match[2], "base64");
      const ext = detectExtension(mime, bytes);
      if (!ext || bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
        skipped += 1;
        console.warn(`Skipped invalid/oversized legacy image in product ${row.id}`);
        continue;
      }
      const filename = `${crypto.randomBytes(24).toString("hex")}.${ext}`;
      await fs.writeFile(path.join(uploadDirectory, filename), bytes, { flag: "wx", mode: 0o600 });
      image.url = `/media/${filename}`;
      image.source_type = image.source_type === "merchant_uploaded_photo" ? "merchant_uploaded_photo" : "illustrative_studio_render";
      changed = true;
      moved += 1;
      if (typeof image.webp_url === "string" && image.webp_url.startsWith("data:image/")) {
        const webpMatch = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image.webp_url);
        if (webpMatch) {
          const webpBytes = Buffer.from(webpMatch[2], "base64");
          const webpExt = detectExtension(webpMatch[1], webpBytes);
          if (webpExt && webpBytes.length > 0 && webpBytes.length <= 10 * 1024 * 1024) {
            const webpFilename = `${crypto.randomBytes(24).toString("hex")}.${webpExt}`;
            await fs.writeFile(path.join(uploadDirectory, webpFilename), webpBytes, { flag: "wx", mode: 0o600 });
            image.webp_url = `/media/${webpFilename}`;
            moved += 1;
          } else {
            image.webp_url = undefined;
            skipped += 1;
          }
        } else {
          image.webp_url = undefined;
          skipped += 1;
        }
      }
    }
    if (changed) {
      await pool.query("UPDATE products SET images = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(images), row.id]);
      console.log(`Migrated media files for product ${row.id}; original image provenance was preserved or defaulted to illustrative.`);
    }
  }

  console.log(`Legacy image migration complete: ${moved} moved, ${skipped} skipped, ${rows.length} products scanned.`);
  if (skipped > 0) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error("Legacy image migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
