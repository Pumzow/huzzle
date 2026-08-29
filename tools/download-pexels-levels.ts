import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import sharp, { type OutputInfo } from "sharp";

import { requiredEnv } from "./lib/env";

type Orientation = "any" | "landscape" | "portrait" | "square";
type DuplicatePolicy = "skip" | "replace";

type DownloadOptions = {
  count: number;
  query: string;
  orientation: Orientation;
  targetBytes: number;
  duplicatePolicy: DuplicatePolicy;
};

type PexelsPhoto = {
  id: number;
  src: Record<string, string>;
};

type PexelsResponse = {
  next_page?: string;
  photos: PexelsPhoto[];
};

type CandidateEntry = {
  imageId: number;
  imageFile: string;
  width: number;
  height: number;
  sizeBytes: number;
  webpQuality: number;
};

type CandidatesManifest = {
  schemaVersion: 1;
  generatedAt: string;
  candidates: CandidateEntry[];
};

type PublishedManifest = {
  levels?: Array<{ imageId?: unknown; pexelsId?: unknown }>;
};

const MAX_PHOTOS = 200;
const DEFAULT_TARGET_KB = 500;
const STARTING_WEBP_QUALITY = 90;
const MINIMUM_WEBP_QUALITY = 82;
const assetRoot = resolve(process.cwd(), "level-assets");
const candidatesRoot = join(assetRoot, "candidates");
const imageDirectory = join(candidatesRoot, "images");
const verifiedDirectory = join(assetRoot, "verified");
const candidatesManifestPath = join(candidatesRoot, "candidates.json");
const publishedManifestPath = join(assetRoot, "levels.json");

function printHelp(): void {
  console.log(`Huzzle Pexels candidate downloader

Usage:
  bun run tools/download-pexels-levels.ts

Downloads 1-${MAX_PHOTOS} photos, converts them to dimension-preserving WebP
candidates, and saves them under level-assets/candidates for manual review.
Nothing is downloaded before the final YES.`);
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
    const sizeAnswer = (await rl.question(`Target maximum image size in KB (default: ${DEFAULT_TARGET_KB}): `)).trim();
    const targetKb = sizeAnswer ? Number.parseInt(sizeAnswer, 10) : DEFAULT_TARGET_KB;
    if (!Number.isInteger(targetKb) || targetKb < 1) {
      console.log("The maximum size must be a positive whole number.");
      return null;
    }
    const duplicatePolicy = parseChoice(
      await rl.question("Existing candidates [skip/replace] (default: skip): "),
      ["skip", "replace"] as const,
      "skip",
    );
    const options = { count, query, orientation, targetBytes: targetKb * 1024, duplicatePolicy };

    console.log("\nDownload summary");
    console.log(`  Photos:       ${options.count}`);
    console.log(`  Topic:        ${options.query}`);
    console.log(`  Orientation:  ${options.orientation}`);
    console.log(`  Target size:  ${targetKb} KB`);
    console.log(`  Duplicates:   ${options.duplicatePolicy}`);
    console.log(`  Destination:  ${candidatesRoot}`);
    const confirmation = (await rl.question("\nType YES to download these candidates: ")).trim();
    return confirmation === "YES" ? options : null;
  } finally {
    rl.close();
  }
}

async function readJson<T>(path: string): Promise<T | null> {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    throw new Error(`Unable to read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function loadCandidatesManifest(): Promise<CandidatesManifest> {
  const manifest = await readJson<CandidatesManifest>(candidatesManifestPath);
  if (!manifest) return { schemaVersion: 1, generatedAt: new Date().toISOString(), candidates: [] };
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.candidates)) {
    throw new Error(`Unsupported candidates manifest: ${candidatesManifestPath}`);
  }
  manifest.candidates = manifest.candidates.filter((candidate) =>
    existsSync(join(candidatesRoot, candidate.imageFile))
  );
  return manifest;
}

async function loadFolderImageIds(directory: string): Promise<Set<number>> {
  if (!existsSync(directory)) return new Set();
  const entries = await readdir(directory, { withFileTypes: true });
  return new Set(entries
    .filter((entry) => entry.isFile())
    .map((entry) => /^pexels-(\d+)\.webp$/i.exec(entry.name)?.[1])
    .filter((id): id is string => Boolean(id))
    .map((id) => Number.parseInt(id, 10)));
}

async function loadPublishedImageIds(): Promise<Set<number>> {
  const manifest = await readJson<PublishedManifest>(publishedManifestPath);
  const ids = manifest?.levels
    ?.map((level) => level.imageId ?? level.pexelsId)
    .filter((id): id is number => typeof id === "number" && Number.isInteger(id)) ?? [];
  return new Set(ids);
}

async function fetchPexelsPhotos(apiKey: string, options: DownloadOptions, blockedIds: Set<number>): Promise<PexelsPhoto[]> {
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
      if (selectedIds.has(photo.id) || blockedIds.has(photo.id)) continue;
      selected.push(photo);
      selectedIds.add(photo.id);
      if (selected.length === options.count) break;
    }
    hasMore = Boolean(result.next_page) && result.photos.length > 0;
    page += 1;
  }
  return selected;
}

async function encodeWebp(bytes: Uint8Array, targetBytes: number): Promise<{
  data: Buffer;
  info: OutputInfo;
  quality: number;
}> {
  let result: { data: Buffer; info: OutputInfo };
  let quality = STARTING_WEBP_QUALITY;
  while (true) {
    result = await sharp(bytes).rotate().webp({ quality, effort: 5 }).toBuffer({ resolveWithObject: true });
    if (result.data.byteLength <= targetBytes || quality === MINIMUM_WEBP_QUALITY) break;
    quality = Math.max(MINIMUM_WEBP_QUALITY, quality - 2);
  }
  return { ...result, quality };
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
  const manifest = await loadCandidatesManifest();
  const publishedIds = await loadPublishedImageIds();
  const verifiedIds = await loadFolderImageIds(verifiedDirectory);
  const candidateIds = new Set(manifest.candidates.map((candidate) => candidate.imageId));
  const blockedIds = new Set(publishedIds);
  verifiedIds.forEach((id) => blockedIds.add(id));
  if (options.duplicatePolicy === "skip") candidateIds.forEach((id) => blockedIds.add(id));

  console.log("\nSearching Pexels...");
  const photos = await fetchPexelsPhotos(apiKey, options, blockedIds);
  if (photos.length === 0) throw new Error("No matching new Pexels photos were found.");
  if (photos.length < options.count) {
    console.warn(`Only ${photos.length} matching photos were available; downloading those instead of ${options.count}.`);
  }

  await mkdir(imageDirectory, { recursive: true });
  await mkdir(verifiedDirectory, { recursive: true });
  const downloaded: CandidateEntry[] = [];
  let completed = 0;
  await runPool(photos, 2, async (photo) => {
    const sourceUrl = photo.src.original || photo.src.large2x || photo.src.large;
    if (!sourceUrl) throw new Error(`Pexels photo ${photo.id} has no usable image URL.`);
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Photo ${photo.id} download failed: ${response.status}`);
    const encoded = await encodeWebp(new Uint8Array(await response.arrayBuffer()), options.targetBytes);
    const fileName = `pexels-${photo.id}.webp`;
    await writeAtomically(join(imageDirectory, fileName), encoded.data);

    const sizeKb = Math.ceil(encoded.data.byteLength / 1024);
    if (encoded.data.byteLength > options.targetBytes) {
      console.warn(`[${photo.id}] Accepted ${sizeKb} KB at quality ${encoded.quality}; dimensions were preserved.`);
    }
    downloaded.push({
      imageId: photo.id,
      imageFile: `images/${fileName}`,
      width: encoded.info.width,
      height: encoded.info.height,
      sizeBytes: encoded.data.byteLength,
      webpQuality: encoded.quality,
    });
    completed += 1;
    console.log(`[${completed}/${photos.length}] Downloaded ${fileName} (${sizeKb} KB, quality ${encoded.quality})`);
  });

  const downloadedIds = new Set(downloaded.map((candidate) => candidate.imageId));
  manifest.candidates = [...manifest.candidates.filter((candidate) => !downloadedIds.has(candidate.imageId)), ...downloaded]
    .sort((a, b) => a.imageId - b.imageId);
  manifest.generatedAt = new Date().toISOString();
  await writeAtomically(
    candidatesManifestPath,
    new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
  );

  console.log(`\nDone. Downloaded ${downloaded.length} candidates.`);
  console.log(`Review folder: ${imageDirectory}`);
  console.log(`Move approved files into ${verifiedDirectory} before publishing.`);
}

await main().catch((error: unknown) => {
  console.error(`\nDownload failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
