import { loadImage } from "./imageProcessor";

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

export type LevelSelectionMode = "random" | "sequence";

export type LoadedLevel = {
  id: number;
  imageUrl: string;
};

export type LevelSelectionOptions = {
  mode: LevelSelectionMode;
  previousLevelId?: number;
  previousImageUrl?: string;
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

function selectLevel(
  levels: ManifestLevel[],
  options: LevelSelectionOptions,
  random: () => number,
): ManifestLevel {
  if (options.mode === "sequence") {
    if (options.previousLevelId === undefined) return levels[0];
    const previousIndex = levels.findIndex((level) => level.id === options.previousLevelId);
    return previousIndex < 0 ? levels[0] : levels[(previousIndex + 1) % levels.length];
  }

  const previousFileName = fileNameFromUrl(options.previousImageUrl);
  const alternatives = levels.filter((level) =>
    level.id !== options.previousLevelId && level.imageFile.split("/").pop() !== previousFileName
  );
  const selectableLevels = alternatives.length > 0 ? alternatives : levels;
  return selectableLevels[Math.floor(random() * selectableLevels.length)];
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

  const selected = selectLevel(levels, options, random);
  const fileName = selected.imageFile.split("/").pop();
  if (!fileName) throw new Error("The selected puzzle image path is invalid.");

  const imageUrl = new URL(encodeURIComponent(fileName), new URL("images/", levelsUrl));
  const cacheVersion = cacheVersionFor(manifest);
  if (cacheVersion) imageUrl.searchParams.set("v", cacheVersion);
  await preloadImage(imageUrl.href);
  return { id: selected.id, imageUrl: imageUrl.href };
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
