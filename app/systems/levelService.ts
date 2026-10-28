import { loadImage } from "./imageProcessor";
import type { LoadedLevel, LevelSelectionMode } from "../types/levelTypes";

type LevelManifest = {
  version?: unknown;
  revision?: unknown;
  generatedAt?: unknown;
  levels?: Array<{ id?: unknown; imageFile?: unknown }>;
};

type ManifestLevel = {
  id: number;
  imageFile: string;
};

export type LevelSelectionOptions = {
  mode: LevelSelectionMode;
  currentLevelId?: number;
  previousLevelId?: number;
  previousImageUrl?: string;
  replay?: boolean;
};

export type LevelServiceDependencies = {
  fetcher: (input: string, init?: RequestInit) => Promise<Response>;
  random: () => number;
  preloadImage: (src: string) => Promise<unknown>;
};

function normalizeLevels(manifest: LevelManifest): ManifestLevel[] {
  const levels = manifest.levels
    ?.map((level, index): ManifestLevel | null => {
      const id = typeof level.id === "number" && Number.isInteger(level.id) && level.id >= 0
        ? level.id
        : index;
      const imageFile = typeof level.imageFile === "string" && level.imageFile.length > 0
        ? level.imageFile
        : typeof level.id === "number" && Number.isInteger(level.id) && level.id >= 0
          ? `${level.id}.webp`
          : null;
      return imageFile ? { id, imageFile } : null;
    })
    .filter((level): level is ManifestLevel => level !== null) ?? [];

  const ids = new Set<number>();
  for (const level of levels) {
    if (ids.has(level.id)) throw new Error(`The puzzle level list contains duplicate level ID ${level.id}.`);
    ids.add(level.id);
  }
  return levels;
}

function fileNameFromUrl(url?: string): string {
  if (!url) return "";
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  } catch {
    return "";
  }
}

type LevelSelection = {
  level: ManifestLevel;
  isReplay: boolean;
};

function selectRandomLevel(
  levels: ManifestLevel[],
  options: LevelSelectionOptions,
  random: () => number,
): ManifestLevel {
  const previousFileName = fileNameFromUrl(options.previousImageUrl);
  const alternatives = levels.filter((level) =>
    level.id !== options.previousLevelId && level.imageFile.split("/").pop() !== previousFileName
  );
  const selectableLevels = alternatives.length > 0 ? alternatives : levels;
  return selectableLevels[Math.floor(random() * selectableLevels.length)];
}

function selectLevel(
  levels: ManifestLevel[],
  options: LevelSelectionOptions,
  random: () => number,
): LevelSelection {
  if (options.mode === "sequence") {
    if (options.currentLevelId !== undefined) {
      const requested = levels.find((level) => level.id === options.currentLevelId);
      if (requested) return { level: requested, isReplay: false };
      const finalLevelId = Math.max(...levels.map((level) => level.id));
      if (options.currentLevelId > finalLevelId) {
        return { level: selectRandomLevel(levels, options, random), isReplay: true };
      }
      return { level: levels[0], isReplay: false };
    }
    if (options.previousLevelId === undefined) return { level: levels[0], isReplay: false };
    const previousIndex = levels.findIndex((level) => level.id === options.previousLevelId);
    if (previousIndex < 0) return { level: levels[0], isReplay: false };
    if (previousIndex === levels.length - 1) {
      return { level: selectRandomLevel(levels, options, random), isReplay: true };
    }
    return { level: levels[previousIndex + 1], isReplay: false };
  }

  return {
    level: selectRandomLevel(levels, options, random),
    isReplay: options.replay === true,
  };
}

function cacheVersionFor(manifest: LevelManifest): string | null {
  if (typeof manifest.revision === "number" || typeof manifest.revision === "string") {
    return String(manifest.revision);
  }
  if (typeof manifest.generatedAt === "string") return manifest.generatedAt;
  if (typeof manifest.version === "number" || typeof manifest.version === "string") {
    return String(manifest.version);
  }
  return null;
}

export async function loadLevelImage(
  levelsUrl: string,
  options: LevelSelectionOptions,
  signal?: AbortSignal,
  dependencies: Partial<LevelServiceDependencies> = {},
): Promise<LoadedLevel> {
  if (!levelsUrl.trim()) {
    throw new Error("Missing VITE_HUZZLE_LEVELS_URL in .env.local.");
  }

  const fetcher = dependencies.fetcher ?? fetch;
  const random = dependencies.random ?? Math.random;
  const preloadImage = dependencies.preloadImage ?? loadImage;
  const response = await fetcher(levelsUrl, { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`Unable to load puzzle levels (${response.status}).`);

  const manifest = await response.json() as LevelManifest;
  const levels = normalizeLevels(manifest);
  if (levels.length === 0) throw new Error("The puzzle level list contains no images.");

  const selection = selectLevel(levels, options, random);
  const selected = selection.level;
  const fileName = selected.imageFile.split("/").pop();
  if (!fileName) throw new Error("The selected puzzle image path is invalid.");

  const imageUrl = new URL(encodeURIComponent(fileName), new URL("images/", levelsUrl));
  const cacheVersion = cacheVersionFor(manifest);
  if (cacheVersion) imageUrl.searchParams.set("v", cacheVersion);
  await preloadImage(imageUrl.href);
  return { id: selected.id, imageUrl: imageUrl.href, isReplay: selection.isReplay };
}

export async function loadRandomLevelImage(
  levelsUrl: string,
  signal?: AbortSignal,
  dependencies: Partial<LevelServiceDependencies> = {},
  previousImageUrl?: string,
): Promise<string> {
  const level = await loadLevelImage(
    levelsUrl,
    { mode: "random", previousImageUrl },
    signal,
    dependencies,
  );
  return level.imageUrl;
}
