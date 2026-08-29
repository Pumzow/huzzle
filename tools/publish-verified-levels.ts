import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";

import { requiredEnv } from "./lib/env";

type PublishedLevel = {
  id: number;
  imageId: number;
};

type LevelsManifest = {
  schemaVersion: 2;
  revision: number;
  levels: PublishedLevel[];
};

type VerifiedImage = {
  path: string;
  fileName: string;
  imageId: number;
};

type Assignment = VerifiedImage & {
  levelId: number;
  publishedFileName: string;
};

const assetRoot = resolve(process.cwd(), "level-assets");
const verifiedDirectory = join(assetRoot, "verified");
const uploadedDirectory = join(assetRoot, "uploaded");
const localManifestPath = join(assetRoot, "levels.json");

function printHelp(): void {
  console.log(`Huzzle verified-level publisher

Usage:
  bun run tools/publish-verified-levels.ts
  bun run tools/publish-verified-levels.ts --reset

Reads pexels-{imageId}.webp files from level-assets/verified, assigns permanent
numeric level IDs, and uploads them with SCP. The password is requested by SCP
and is never read or stored by this script.

--reset starts a new schema-version-2 manifest at level 0. It does not delete
old orphaned image files from the web server.`);
}

function emptyManifest(): LevelsManifest {
  return { schemaVersion: 2, revision: 0, levels: [] };
}

function validateManifest(value: unknown, source: string): LevelsManifest {
  const manifest = value as Partial<LevelsManifest>;
  if (manifest.schemaVersion !== 2 || !Number.isInteger(manifest.revision) || !Array.isArray(manifest.levels)) {
    throw new Error(`${source} is not a supported schema-version-2 levels manifest. Use --reset during development to replace it.`);
  }
  const seenLevelIds = new Set<number>();
  const seenImageIds = new Set<number>();
  for (const level of manifest.levels) {
    if (!Number.isInteger(level.id) || level.id < 0 || !Number.isInteger(level.imageId) || level.imageId < 1) {
      throw new Error(`${source} contains an invalid level entry.`);
    }
    if (seenLevelIds.has(level.id)) throw new Error(`${source} contains duplicate level ID ${level.id}.`);
    if (seenImageIds.has(level.imageId)) throw new Error(`${source} contains duplicate image ID ${level.imageId}.`);
    seenLevelIds.add(level.id);
    seenImageIds.add(level.imageId);
  }
  return manifest as LevelsManifest;
}

async function loadVerifiedImages(): Promise<VerifiedImage[]> {
  if (!existsSync(verifiedDirectory)) {
    throw new Error(`Missing verified folder: ${verifiedDirectory}`);
  }
  const entries = await readdir(verifiedDirectory, { withFileTypes: true });
  const unexpected = entries.filter((entry) => entry.isFile() && !/^pexels-\d+\.webp$/i.test(entry.name));
  if (unexpected.length > 0) {
    throw new Error(`Verified folder contains unsupported files: ${unexpected.map((entry) => entry.name).join(", ")}`);
  }
  const images = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const match = /^pexels-(\d+)\.webp$/i.exec(entry.name)!;
      return {
        path: join(verifiedDirectory, entry.name),
        fileName: entry.name,
        imageId: Number.parseInt(match[1], 10),
      };
    })
    .sort((a, b) => a.imageId - b.imageId);
  if (images.length === 0) throw new Error(`No verified WebP images were found in ${verifiedDirectory}.`);
  return images;
}

function assignLevels(manifest: LevelsManifest, images: VerifiedImage[]): Assignment[] {
  const publishedImageIds = new Set(manifest.levels.map((level) => level.imageId));
  const duplicate = images.find((image) => publishedImageIds.has(image.imageId));
  if (duplicate) throw new Error(`Pexels image ${duplicate.imageId} is already published.`);

  const verifiedIds = new Set<number>();
  for (const image of images) {
    if (verifiedIds.has(image.imageId)) throw new Error(`Verified image ID ${image.imageId} appears more than once.`);
    verifiedIds.add(image.imageId);
  }

  let nextLevelId = manifest.levels.reduce((highest, level) => Math.max(highest, level.id), -1) + 1;
  return images.map((image) => {
    const levelId = nextLevelId++;
    return { ...image, levelId, publishedFileName: `${levelId}.webp` };
  });
}

async function runScp(arguments_: string[]): Promise<void> {
  const exitCode = await new Promise<number | null>((resolvePromise, reject) => {
    const child = spawn("scp", arguments_, { stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("close", resolvePromise);
  });
  if (exitCode !== 0) throw new Error(`SCP failed with exit code ${exitCode ?? "unknown"}.`);
}

async function readRemoteManifest(scpTarget: string, destination: string): Promise<LevelsManifest> {
  console.log("\nDownloading the current remote manifest. Enter the SCP password when prompted.");
  await runScp([`${scpTarget}/levels.json`, destination]);
  return validateManifest(JSON.parse(await readFile(destination, "utf8")), "Remote levels.json");
}

async function confirmPublish(assignments: Assignment[], manifest: LevelsManifest, reset: boolean): Promise<boolean> {
  console.log("\nPublish preview");
  if (reset) console.log("  Mode: RESET manifest (old remote images are not deleted)");
  for (const assignment of assignments) {
    console.log(`  Level ${assignment.levelId}: ${assignment.fileName} -> images/${assignment.publishedFileName}`);
  }
  console.log(`  New revision: ${manifest.revision + 1}`);
  console.log("  Password prompts: two (images, then manifest)");

  const rl = createInterface({ input, output });
  try {
    return (await rl.question("\nType YES to publish these levels: ")).trim() === "YES";
  } finally {
    rl.close();
  }
}

async function writeLocalManifest(bytes: Uint8Array): Promise<void> {
  await mkdir(assetRoot, { recursive: true });
  const temporaryPath = `${localManifestPath}.part`;
  await writeFile(temporaryPath, bytes);
  await rename(temporaryPath, localManifestPath);
}

async function archiveVerifiedImages(assignments: Assignment[]): Promise<void> {
  await mkdir(uploadedDirectory, { recursive: true });
  for (const assignment of assignments) {
    await rename(assignment.path, join(uploadedDirectory, assignment.fileName));
  }
}

function assertArchiveDestinationsAvailable(assignments: Assignment[]): void {
  for (const assignment of assignments) {
    const destination = join(uploadedDirectory, assignment.fileName);
    if (existsSync(destination)) throw new Error(`Uploaded archive already contains ${basename(destination)}.`);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }
  const reset = process.argv.includes("--reset");
  const scpTarget = requiredEnv("HUZZLE_SCP_TARGET").replace(/\/$/, "");
  const verifiedImages = await loadVerifiedImages();
  const stagingDirectory = await mkdtemp(join(tmpdir(), "huzzle-publish-"));

  try {
    const manifest = reset
      ? emptyManifest()
      : await readRemoteManifest(scpTarget, join(stagingDirectory, "remote-levels.json"));
    const assignments = assignLevels(manifest, verifiedImages);
    const nextManifest: LevelsManifest = {
      schemaVersion: 2,
      revision: manifest.revision + 1,
      levels: [
        ...manifest.levels,
        ...assignments.map(({ levelId, imageId }) => ({ id: levelId, imageId })),
      ],
    };

    for (const assignment of assignments) {
      await copyFile(assignment.path, join(stagingDirectory, assignment.publishedFileName));
    }
    const manifestBytes = new TextEncoder().encode(`${JSON.stringify(nextManifest, null, 2)}\n`);
    const stagedManifestPath = join(stagingDirectory, "levels.json");
    await writeFile(stagedManifestPath, manifestBytes);
    assertArchiveDestinationsAvailable(assignments);

    if (!await confirmPublish(assignments, manifest, reset)) {
      console.log("Publish cancelled. No remote or verified files were changed.");
      return;
    }

    console.log("\nUploading images. Enter the SCP password when prompted.");
    await runScp([
      ...assignments.map((assignment) => join(stagingDirectory, assignment.publishedFileName)),
      `${scpTarget}/images/`,
    ]);
    console.log("\nUploading levels.json last. Enter the SCP password when prompted.");
    await runScp([stagedManifestPath, `${scpTarget}/levels.json`]);

    await writeLocalManifest(manifestBytes);
    await archiveVerifiedImages(assignments);
    console.log(`\nPublished ${assignments.length} levels successfully.`);
    console.log(`Local manifest: ${localManifestPath}`);
    console.log(`Archived inputs: ${uploadedDirectory}`);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

await main().catch((error: unknown) => {
  console.error(`\nPublish failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
