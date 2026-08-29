import { appConfig } from "../config/appConfig";
import { platformApi, type HuzzleProgress } from "./platformApi";
import { platformSession } from "./platformSession";

type ProgressApi = {
  getHuzzleProgress(token: string): Promise<HuzzleProgress>;
  saveHuzzleProgress(token: string, currentLevel: number): Promise<HuzzleProgress>;
};

type ProgressSession = {
  readonly authenticationToken: string | null;
  whenReady?(): Promise<void>;
};

type ProgressStorage = Pick<Storage, "getItem" | "setItem">;

function normalizeLevel(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function browserStorage(): ProgressStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class LevelProgressStore {
  constructor(
    private readonly api: ProgressApi = platformApi,
    private readonly session: ProgressSession = platformSession,
    private readonly storage: ProgressStorage | null = browserStorage(),
  ) {}

  async load(): Promise<number> {
    const localLevel = this.readLocal();
    try {
      return await this.syncAuthenticated();
    } catch {
      return localLevel;
    }
  }

  async syncAuthenticated(): Promise<number> {
    const localLevel = this.readLocal();
    await this.session.whenReady?.();
    const token = this.session.authenticationToken;
    if (!token) return localLevel;

    const serverProgress = await this.api.getHuzzleProgress(token);
    const serverLevel = normalizeLevel(serverProgress.currentLevel);
    const mergedLevel = Math.max(serverLevel, localLevel);
    if (mergedLevel > serverLevel) {
      await this.api.saveHuzzleProgress(token, mergedLevel);
    }
    return mergedLevel;
  }

  async save(currentLevel: number): Promise<void> {
    const level = normalizeLevel(currentLevel);
    const token = this.session.authenticationToken;
    if (token) {
      await this.api.saveHuzzleProgress(token, level);
      return;
    }
    this.writeLocal(Math.max(this.readLocal(), level));
  }

  private readLocal(): number {
    if (!this.storage) return 0;
    try {
      return normalizeLevel(Number(this.storage.getItem(appConfig.platform.progressStorageKey)));
    } catch {
      return 0;
    }
  }

  private writeLocal(level: number): void {
    try {
      this.storage?.setItem(appConfig.platform.progressStorageKey, String(level));
    } catch {
      // Progress remains available for the active puzzle when storage is unavailable.
    }
  }
}

export const levelProgressStore = new LevelProgressStore();
