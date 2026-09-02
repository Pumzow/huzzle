import { appConfig } from "../config/appConfig";
import type { GridSize, PuzzleBoardState, TileShapeTypes } from "../types/gameTypes";

type AttemptStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type LevelAttemptSnapshot = PuzzleBoardState & {
  version: 1;
  levelId: number;
  gridSize: GridSize;
  tileShape: TileShapeTypes;
  elapsedSeconds: number;
  hintUsed: boolean;
};

function browserStorage(): AttemptStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPermutation(value: unknown, size: number): value is number[] {
  return Array.isArray(value) &&
    value.length === size &&
    value.every((slot) => isNonNegativeInteger(slot) && slot < size) &&
    new Set(value).size === size;
}

export class LevelAttemptStore {
  constructor(private readonly storage: AttemptStorage | null = browserStorage()) {}

  load(levelId: number, gridSize: GridSize, tileShape: TileShapeTypes): LevelAttemptSnapshot | null {
    try {
      const raw = this.storage?.getItem(appConfig.levels.attemptStorageKey);
      if (!raw) return null;
      const snapshot = JSON.parse(raw) as Partial<LevelAttemptSnapshot>;
      const tileCount = gridSize * gridSize;
      if (
        snapshot.version !== 1 ||
        snapshot.levelId !== levelId ||
        snapshot.gridSize !== gridSize ||
        snapshot.tileShape !== tileShape ||
        !isPermutation(snapshot.slots, tileCount) ||
        !isNonNegativeInteger(snapshot.moves) ||
        !isNonNegativeInteger(snapshot.groups) ||
        !isNonNegativeInteger(snapshot.startingGroups) ||
        !isNonNegativeInteger(snapshot.moveLimit) ||
        !isNonNegativeInteger(snapshot.elapsedSeconds) ||
        typeof snapshot.started !== "boolean" ||
        typeof snapshot.hintUsed !== "boolean"
      ) return null;
      return snapshot as LevelAttemptSnapshot;
    } catch {
      return null;
    }
  }

  save(snapshot: LevelAttemptSnapshot): void {
    try {
      this.storage?.setItem(appConfig.levels.attemptStorageKey, JSON.stringify(snapshot));
    } catch {
      // The active level remains playable when storage is unavailable.
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(appConfig.levels.attemptStorageKey);
    } catch {
      // Ignore unavailable storage.
    }
  }
}

export const levelAttemptStore = new LevelAttemptStore();
