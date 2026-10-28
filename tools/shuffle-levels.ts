import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
import { createInterface, type Interface } from "node:readline/promises";

import { requiredEnv } from "./lib/env";
import { shuffleManifestRange, shuffledCopy, validateShufflableManifest } from "./lib/levelShuffle";

type VerifiedOrder = {
  schemaVersion: 1;
  files: string[];
};

const assetRoot = resolve(process.cwd(), "level-assets");
const verifiedDirectory = join(assetRoot, "verified");
const verifiedOrderPath = join(assetRoot, "verified-order.json");
const localManifestPath = join(assetRoot, "levels.json");

async function runScp(arguments_: string[]): Promise<void> {
  const exitCode = await new Promise<number | null>((resolvePromise, reject) => {
    const child = spawn("scp", arguments_, { stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("close", resolvePromise);
  });
  if (exitCode !== 0) throw new Error(`SCP failed with exit code ${exitCode ?? "unknown"}.`);
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

async function askInteger(rl: Interface, prompt: string): Promise<number> {
  while (true) {
    const value = Number((await rl.question(prompt)).trim());
    if (Number.isInteger(value) && value >= 0) return value;
    console.log("Please enter a non-negative whole number.");
  }
}

async function shuffleServer(rl: Interface): Promise<void> {
  const fromId = await askInteger(rl, "First level ID to include: ");
  const toId = await askInteger(rl, "Last level ID to include: ");
  if (toId < fromId) throw new Error("The last level ID cannot be lower than the first level ID.");

  const scpTarget = requiredEnv("HUZZLE_SCP_TARGET").replace(/\/$/, "");
  const stagingDirectory = await mkdtemp(join(tmpdir(), "huzzle-shuffle-"));
  try {
    const downloadedManifest = join(stagingDirectory, "levels.current.json");
    console.log("\nDownloading the current server level list. Enter the SCP password when prompted.");
    await runScp([`${scpTarget}/levels.json`, downloadedManifest]);
    const current = validateShufflableManifest(
      JSON.parse(await readFile(downloadedManifest, "utf8")),
      "Remote levels.json",
    );
    const next = shuffleManifestRange(current, fromId, toId);
    const oldOrder = current.levels.filter((level) => level.id >= fromId && level.id <= toId).map((level) => level.id);
    const newOrder = next.levels.filter((_, index) => {
      const oldLevel = current.levels[index];
      return oldLevel.id >= fromId && oldLevel.id <= toId;
    }).map((level) => level.id);

    console.log("\nServer shuffle preview");
    console.log(`  Included IDs: ${fromId}-${toId}`);
    console.log(`  Current order: ${oldOrder.join(", ")}`);
    console.log(`  New order:     ${newOrder.join(", ")}`);
    console.log(`  Revision:      ${current.revision} -> ${next.revision}`);
    if ((await rl.question("\nType YES to upload the shuffled level list: ")).trim() !== "YES") {
      console.log("Shuffle cancelled. No server or local files were changed.");
      return;
    }

    const bytes = new TextEncoder().encode(`${JSON.stringify(next, null, 2)}\n`);
    const stagedManifest = join(stagingDirectory, "levels.json");
    await writeFile(stagedManifest, bytes);
    console.log("\nUploading the shuffled level list. Enter the SCP password when prompted.");
    await runScp([stagedManifest, `${scpTarget}/levels.json`]);
    await mkdir(assetRoot, { recursive: true });
    await writeAtomically(localManifestPath, bytes);
    console.log(`\nShuffled ${oldOrder.length} server levels successfully.`);
    console.log(`Local mirror: ${localManifestPath}`);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

async function shuffleVerified(rl: Interface): Promise<void> {
  if (!existsSync(verifiedDirectory)) throw new Error(`Missing verified folder: ${verifiedDirectory}`);
  const entries = await readdir(verifiedDirectory, { withFileTypes: true });
  const unexpected = entries.filter((entry) => entry.isFile() && !/^pexels-\d+\.webp$/i.test(entry.name));
  if (unexpected.length > 0) {
    throw new Error(`Verified folder contains unsupported files: ${unexpected.map((entry) => entry.name).join(", ")}`);
  }
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  if (files.length < 2) throw new Error("The verified folder must contain at least two images to shuffle.");
  const shuffled = shuffledCopy(files);

  console.log("\nVerified publishing-order preview");
  shuffled.forEach((file, index) => console.log(`  ${index + 1}. ${file}`));
  if ((await rl.question("\nType YES to save this publishing order: ")).trim() !== "YES") {
    console.log("Shuffle cancelled. No files were changed.");
    return;
  }

  const order: VerifiedOrder = { schemaVersion: 1, files: shuffled };
  await mkdir(assetRoot, { recursive: true });
  await writeAtomically(verifiedOrderPath, new TextEncoder().encode(`${JSON.stringify(order, null, 2)}\n`));
  console.log(`\nSaved a shuffled order for ${files.length} verified images.`);
  console.log("The publisher will assign level IDs in this order.");
}

async function main(): Promise<void> {
  const rl = createInterface({ input, output });
  try {
    let destination = "";
    while (destination !== "server" && destination !== "verified") {
      destination = (await rl.question("Shuffle [server/verified]: ")).trim().toLowerCase();
      if (destination !== "server" && destination !== "verified") {
        console.log("Please enter server or verified.");
      }
    }
    if (destination === "server") await shuffleServer(rl);
    else await shuffleVerified(rl);
  } finally {
    rl.close();
  }
}

await main().catch((error: unknown) => {
  console.error(`\nShuffle failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
