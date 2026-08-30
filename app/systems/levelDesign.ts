import type { GridSize, TileShape, TileShapeTypes } from "../types/gameTypes";

export type LevelDesignConfig = {
  gridSizeSequence: readonly GridSize[];
  enabledShapes: readonly TileShape[];
  useLevelIdSeed: boolean;
};

export type LevelDesign = {
  gridSize: GridSize;
  tileShape: TileShapeTypes;
};

function channelHash(channel: string): number {
  let hash = 2166136261;
  for (let index = 0; index < channel.length; index++) {
    hash = Math.imul(hash ^ channel.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function randomForLevel(levelId: number, channel: string, useSeed: boolean): () => number {
  if (!useSeed) return Math.random;
  const levelSeed = Math.imul((levelId + 1) >>> 0, 0x9e3779b1) ^ channelHash(channel);
  return seededRandom(levelSeed);
}

export function levelDesignFor(
  levelId: number,
  config: LevelDesignConfig,
  random = randomForLevel(levelId, "shape", config.useLevelIdSeed),
): LevelDesign {
  if (config.gridSizeSequence.length === 0) throw new Error("The level grid sequence cannot be empty.");
  if (config.enabledShapes.length === 0) throw new Error("At least one puzzle shape must be enabled.");
  if (config.enabledShapes.some(({ weight = 1 }) => !Number.isFinite(weight) || weight <= 0)) {
    throw new Error("Enabled puzzle shapes must have positive weights.");
  }
  const normalizedLevelId = Math.max(0, Math.trunc(levelId));
  const totalWeight = config.enabledShapes.reduce((total, { weight = 1 }) => total + weight, 0);
  const selection = random() * totalWeight;
  let cumulativeWeight = 0;
  const selectedShape = config.enabledShapes.find(({ weight = 1 }) => {
    cumulativeWeight += weight;
    return selection < cumulativeWeight;
  }) ?? config.enabledShapes[config.enabledShapes.length - 1];
  return {
    gridSize: config.gridSizeSequence[normalizedLevelId % config.gridSizeSequence.length],
    tileShape: selectedShape.value,
  };
}
