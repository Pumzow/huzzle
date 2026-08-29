import { loadImage } from "./imageProcessor";

type LevelManifest = {
  version?: unknown;
  revision?: unknown;
  generatedAt?: unknown;
  levels?: Array<{ id?: unknown; imageFile?: unknown }>;
};

export type LevelServiceDependencies = {
  fetcher: (input: string, init?: RequestInit) => Promise<Response>;
  random: () => number;
  preloadImage: (src: string) => Promise<unknown>;
};

export async function loadRandomLevelImage(
  levelsUrl: string,
  imageBaseUrl: string,
  signal?: AbortSignal,
  dependencies: Partial<LevelServiceDependencies> = {},
  previousImageUrl?: string,
): Promise<string> {
  const fetcher = dependencies.fetcher ?? fetch;
  const random = dependencies.random ?? Math.random;
  const preloadImage = dependencies.preloadImage ?? loadImage;
  const response = await fetcher(levelsUrl, { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`Unable to load puzzle levels (${response.status}).`);

  const manifest = await response.json() as LevelManifest;
  const imageFiles = manifest.levels
    ?.map((level) => typeof level.imageFile === "string"
      ? level.imageFile
      : typeof level.id === "number" && Number.isInteger(level.id) && level.id >= 0
        ? `${level.id}.webp`
        : undefined)
    .filter((imageFile): imageFile is string => typeof imageFile === "string" && imageFile.length > 0) ?? [];
  if (imageFiles.length === 0) throw new Error("The puzzle level list contains no images.");

  const previousFileName = previousImageUrl
    ? decodeURIComponent(new URL(previousImageUrl).pathname.split("/").pop() ?? "")
    : "";
  const alternateImageFiles = previousFileName
    ? imageFiles.filter((imageFile) => imageFile.split("/").pop() !== previousFileName)
    : imageFiles;
  const selectableImageFiles = alternateImageFiles.length > 0 ? alternateImageFiles : imageFiles;
  const imageFile = selectableImageFiles[Math.floor(random() * selectableImageFiles.length)];
  const fileName = imageFile.split("/").pop();
  if (!fileName) throw new Error("The selected puzzle image path is invalid.");

  const imageUrl = new URL(encodeURIComponent(fileName), imageBaseUrl);
  const cacheVersion = typeof manifest.generatedAt === "string"
    ? manifest.generatedAt
    : typeof manifest.revision === "number" || typeof manifest.revision === "string"
      ? String(manifest.revision)
    : typeof manifest.version === "number" || typeof manifest.version === "string"
      ? String(manifest.version)
      : null;
  if (cacheVersion) imageUrl.searchParams.set("v", cacheVersion);
  await preloadImage(imageUrl.href);
  return imageUrl.href;
}
