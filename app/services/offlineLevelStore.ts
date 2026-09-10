import { appConfig } from "../config/appConfig";

type OfflineStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): OfflineStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function validIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export class OfflineLevelStore {
  private memoryIndex = 0;
  private debugForced = false;

  constructor(private readonly storage: OfflineStorage | null = browserStorage()) {}

  get currentLevel(): number {
    try {
      const raw = this.storage?.getItem(appConfig.levels.offlineProgressStorageKey);
      if (raw !== null && raw !== undefined) {
        const stored = Number(raw);
        if (validIndex(stored)) this.memoryIndex = stored;
      }
    } catch {
      // Keep the in-memory progression when storage is unavailable.
    }
    return this.memoryIndex;
  }

  complete(levelIndex: number): number {
    const next = Math.max(this.currentLevel, Math.max(0, Math.trunc(levelIndex)) + 1);
    this.memoryIndex = next;
    try {
      this.storage?.setItem(appConfig.levels.offlineProgressStorageKey, String(next));
    } catch {
      // The player can continue in memory when storage is unavailable.
    }
    return next;
  }

  get isDebugForced(): boolean {
    return this.debugForced;
  }

  setDebugForced(enabled: boolean): void {
    this.debugForced = enabled;
  }
}

export const offlineLevelStore = new OfflineLevelStore();
