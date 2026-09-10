export type ShufflableLevel = {
  id: number;
  imageId: number;
};

export type ShufflableManifest = {
  schemaVersion: 2;
  revision: number;
  levels: ShufflableLevel[];
};

export function shuffledCopy<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  if (shuffled.length > 1 && shuffled.every((item, index) => item === items[index])) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export function shuffleManifestRange(
  manifest: ShufflableManifest,
  fromId: number,
  toId: number,
  random: () => number = Math.random,
): ShufflableManifest {
  const selectedIndexes = manifest.levels
    .map((level, index) => level.id >= fromId && level.id <= toId ? index : -1)
    .filter((index) => index >= 0);

  if (selectedIndexes.length < 2) {
    throw new Error(`The range ${fromId}-${toId} must contain at least two published levels.`);
  }

  const selectedLevels = shuffledCopy(selectedIndexes.map((index) => manifest.levels[index]), random);
  const levels = [...manifest.levels];
  selectedIndexes.forEach((manifestIndex, selectedIndex) => {
    levels[manifestIndex] = selectedLevels[selectedIndex];
  });

  return { ...manifest, revision: manifest.revision + 1, levels };
}

export function validateShufflableManifest(value: unknown, source: string): ShufflableManifest {
  const manifest = value as Partial<ShufflableManifest>;
  if (manifest.schemaVersion !== 2 || !Number.isInteger(manifest.revision) || !Array.isArray(manifest.levels)) {
    throw new Error(`${source} is not a supported schema-version-2 levels manifest.`);
  }

  const seenIds = new Set<number>();
  const seenImageIds = new Set<number>();
  for (const level of manifest.levels) {
    if (!Number.isInteger(level.id) || level.id < 0 || !Number.isInteger(level.imageId) || level.imageId < 1) {
      throw new Error(`${source} contains an invalid level entry.`);
    }
    if (seenIds.has(level.id)) throw new Error(`${source} contains duplicate level ID ${level.id}.`);
    if (seenImageIds.has(level.imageId)) throw new Error(`${source} contains duplicate image ID ${level.imageId}.`);
    seenIds.add(level.id);
    seenImageIds.add(level.imageId);
  }
  return manifest as ShufflableManifest;
}
