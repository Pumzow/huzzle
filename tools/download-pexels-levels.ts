import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { requiredEnv } from "./lib/env";

type Orientation = "any" | "landscape" | "portrait" | "square";
type ImageQuality = "large" | "large2x" | "original";
type DuplicatePolicy = "skip" | "replace";

type DownloadOptions = {
  count: number;
  query: string;
  orientation: Orientation;
  quality: ImageQuality;
  duplicatePolicy: DuplicatePolicy;
};

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  alt?: string;
  src: Record<string, string>;
};

type PexelsResponse = {
  next_page?: string;
  photos: PexelsPhoto[];
};

type LevelEntry = {
  id: string;
  pexelsId: number;
  title: string;
  photographer: string;
  pexelsUrl: string;
  imageFile: string;
  width: number;
  height: number;
};

type LevelsManifest = {
  version: 1;
  generatedAt: string;
  levels: LevelEntry[];
};

const MAX_PHOTOS = 200;
const assetRoot = resolve(process.cwd(), "level-assets");
const imageDirectory = join(assetRoot, "images");
const manifestPath = join(assetRoot, "levels.json");

function printHelp(): void {
  console.log(`Huzzle Pexels level downloader

Usage:
  bun run tools/download-pexels-levels.ts

Downloads 1-${MAX_PHOTOS} photos into level-assets/images and generates
level-assets/levels.json. Nothing is downloaded before the final YES.`);
}

function parseChoice<T extends string>(answer: string, choices: readonly T[], fallback: T): T {
  const normalized = answer.trim().toLowerCase();
  return choices.includes(normalized as T) ? normalized as T : fallback;
}

async function askOptions(): Promise<DownloadOptions | null> {
  const rl = createInterface({ input, output });
  try {
    let count = 0;
    while (count < 1 || count > MAX_PHOTOS) {
      const answer = await rl.question(`How many photos should be downloaded? (1-${MAX_PHOTOS}): `);
      count = Number.parseInt(answer.trim(), 10);
      if (!Number.isInteger(count) || count < 1 || count > MAX_PHOTOS) {
        console.log(`Please enter a whole number from 1 to ${MAX_PHOTOS}.`);
        count = 0;
      }
    }

    let query = "";
    while (!query) query = (await rl.question("Pexels search topic (for example: nature, cities, animals): ")).trim();
    const orientation = parseChoice(
      await rl.question("Orientation [any/landscape/portrait/square] (default: square): "),
      ["any", "landscape", "portrait", "square"] as const,
      "square",
    );
    const quality = parseChoice(
      await rl.question("Download quality [large/large2x/original] (default: large2x): "),
      ["large", "large2x", "original"] as const,
      "large2x",
    );
    const duplicatePolicy = parseChoice(
      await rl.question("Existing Pexels photos [skip/replace] (default: skip): "),
      ["skip", "replace"] as const,
      "skip",
    );

    const options = { count, query, orientation, quality, duplicatePolicy };
    console.log("\nDownload summary");
    console.log(`  Photos:       ${options.count}`);
    console.log(`  Topic:        ${options.query}`);
    console.log(`  Orientation:  ${options.orientation}`);
    console.log(`  Quality:      ${options.quality}`);
    console.log(`  Duplicates:   ${options.duplicatePolicy}`);
    console.log(`  Destination:  ${assetRoot}`);
    const confirmation = (await rl.question("\nType YES to download these photos: ")).trim();
    return confirmation === "YES" ? options : null;
  } finally {
    rl.close();
  }
}

function safeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "level";
}

function imageExtension(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

async function loadManifest(): Promise<LevelsManifest> {
  if (!existsSync(manifestPath)) return { version: 1, generatedAt: new Date().toISOString(), levels: [] };
  try {
    const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as LevelsManifest;
    if (parsed.version === 1 && Array.isArray(parsed.levels)) {
      return {
        version: 1,
        generatedAt: parsed.generatedAt,
        levels: parsed.levels.map((level) => ({
          id: level.id,
          pexelsId: level.pexelsId,
          title: level.title,
          photographer: level.photographer,
          pexelsUrl: level.pexelsUrl,
          imageFile: level.imageFile,
          width: level.width,
          height: level.height,
        })),
      };
    }
  } catch (error) {
    console.warn(`The existing manifest could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { version: 1, generatedAt: new Date().toISOString(), levels: [] };
}

async function fetchPexelsPhotos(apiKey: string, options: DownloadOptions, existingIds: Set<number>): Promise<PexelsPhoto[]> {
  const selected: PexelsPhoto[] = [];
  const selectedIds = new Set<number>();
  let page = 1;
  let hasMore = true;
  while (selected.length < options.count && hasMore) {
    const params = new URLSearchParams({ query: options.query, page: String(page), per_page: "80" });
    if (options.orientation !== "any") params.set("orientation", options.orientation);
    const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: apiKey },
    });
    if (!response.ok) throw new Error(`Pexels search failed: ${response.status} ${await response.text()}`);
    const result = await response.json() as PexelsResponse;
    for (const photo of result.photos) {
      if (selectedIds.has(photo.id)) continue;
      if (existingIds.has(photo.id) && options.duplicatePolicy === "skip") continue;
      selected.push(photo);
      selectedIds.add(photo.id);
      if (selected.length === options.count) break;
    }
    hasMore = Boolean(result.next_page) && result.photos.length > 0;
    page += 1;
  }
  return selected;
}

async function writeAtomically(path: string, bytes: Uint8Array): Promise<void> {
  const temporaryPath = `${path}.part`;
  try {
    await writeFile(temporaryPath, bytes);
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function runWorker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }
  const options = await askOptions();
  if (!options) {
    console.log("Download cancelled. No files were changed.");
    return;
  }

  const apiKey = requiredEnv("PEXELS_API_KEY");
  const manifest = await loadManifest();
  const existingIds = new Set(manifest.levels.map((level) => level.pexelsId));
  console.log("\nSearching Pexels...");
  const photos = await fetchPexelsPhotos(apiKey, options, existingIds);
  if (photos.length === 0) throw new Error("No matching new Pexels photos were found.");
  if (photos.length < options.count) {
    console.warn(`Only ${photos.length} matching photos were available; downloading those instead of ${options.count}.`);
  }

  await mkdir(imageDirectory, { recursive: true });
  const downloaded: LevelEntry[] = [];
  let completed = 0;
  await runPool(photos, 4, async (photo) => {
    const sourceUrl = photo.src[options.quality] || photo.src.large2x || photo.src.original;
    if (!sourceUrl) throw new Error(`Pexels photo ${photo.id} has no usable image URL.`);
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Photo ${photo.id} download failed: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    const fileName = `${safeName(options.query)}-${photo.id}.${imageExtension(mimeType)}`;
    await writeAtomically(join(imageDirectory, fileName), bytes);
    downloaded.push({
      id: `pexels-${photo.id}`,
      pexelsId: photo.id,
      title: photo.alt?.trim() || `${options.query} puzzle`,
      photographer: photo.photographer,
      pexelsUrl: photo.url,
      imageFile: `images/${fileName}`,
      width: photo.width,
      height: photo.height,
    });
    completed += 1;
    console.log(`[${completed}/${photos.length}] Downloaded ${fileName}`);
  });

  const downloadedIds = new Set(downloaded.map((level) => level.id));
  manifest.levels = [...manifest.levels.filter((level) => !downloadedIds.has(level.id)), ...downloaded]
    .sort((a, b) => a.id.localeCompare(b.id));
  manifest.generatedAt = new Date().toISOString();
  await writeAtomically(manifestPath, new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`));

  console.log(`\nDone. Downloaded ${downloaded.length} photos.`);
  console.log(`Manifest: ${manifestPath}`);
}

await main().catch((error: unknown) => {
  console.error(`\nDownload failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
