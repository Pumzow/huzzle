import { appConfig } from "../config/appConfig";
import { gameConfig } from "../config/gameConfig";
import { platformApi, type HuzzleCompletion, type HuzzleProgress } from "./platformApi";
import { platformSession } from "./platformSession";

type ProgressApi = {
  getHuzzleProgress(token: string): Promise<HuzzleProgress>;
  saveHuzzleProgress(token: string, currentLevel: number, points: number): Promise<HuzzleProgress>;
  completeHuzzleLevel(token: string, currentLevel: number, stars: number): Promise<HuzzleCompletion>;
};

type ProgressSession = {
  readonly authenticationToken: string | null;
  whenReady?(): Promise<void>;
};

type ProgressStorage = Pick<Storage, "getItem" | "setItem">;

export type PlayerProgress = {
  currentLevel: number;
  points: number;
};

export type LevelCompletion = PlayerProgress & {
  pointsAwarded: number;
};

function normalizeLevel(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function normalizePoints(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function pointsForStars(stars: number): number {
  const normalizedStars = Number.isInteger(stars)
    ? Math.min(gameConfig.scoring.startingStars, Math.max(0, stars))
    : 0;
  return normalizedStars * gameConfig.scoring.pointsPerStar;
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

  async load(): Promise<PlayerProgress> {
    const localProgress = this.readLocal();
    try {
      return await this.syncAuthenticated();
    } catch {
      return localProgress;
    }
  }

  async syncAuthenticated(): Promise<PlayerProgress> {
    const localProgress = this.readLocal();
    await this.session.whenReady?.();
    const token = this.session.authenticationToken;
    if (!token) return localProgress;

    const serverProgress = await this.api.getHuzzleProgress(token);
    const server = {
      currentLevel: normalizeLevel(serverProgress.currentLevel),
      points: normalizePoints(serverProgress.points),
    };
    const merged = {
      currentLevel: Math.max(server.currentLevel, localProgress.currentLevel),
      points: Math.max(server.points, localProgress.points),
    };
    if (merged.currentLevel > server.currentLevel || merged.points > server.points) {
      await this.api.saveHuzzleProgress(token, merged.currentLevel, merged.points);
    }
    return merged;
  }

  async complete(currentLevel: number, stars: number): Promise<LevelCompletion> {
    const level = normalizeLevel(currentLevel);
    const token = this.session.authenticationToken;
    if (token) {
      try {
        const completion = await this.api.completeHuzzleLevel(token, level, stars);
        return {
          currentLevel: normalizeLevel(completion.currentLevel),
          points: normalizePoints(completion.points),
          pointsAwarded: normalizePoints(completion.pointsAwarded),
        };
      } catch {
        return this.completeLocally(level, stars);
      }
    }
    return this.completeLocally(level, stars);
  }

  private completeLocally(currentLevel: number, stars: number): LevelCompletion {
    const progress = this.readLocal();
    const pointsAwarded = currentLevel > progress.currentLevel ? pointsForStars(stars) : 0;
    const completed = {
      currentLevel: Math.max(progress.currentLevel, currentLevel),
      points: progress.points + pointsAwarded,
    };
    this.writeLocal(completed);
    return { ...completed, pointsAwarded };
  }

  private readLocal(): PlayerProgress {
    if (!this.storage) return { currentLevel: 0, points: 0 };
    try {
      const stored = this.storage.getItem(appConfig.platform.progressStorageKey);
      if (!stored) return { currentLevel: 0, points: 0 };
      const legacyLevel = Number(stored);
      if (Number.isFinite(legacyLevel)) {
        return { currentLevel: normalizeLevel(legacyLevel), points: 0 };
      }
      const parsed = JSON.parse(stored) as Partial<PlayerProgress>;
      return {
        currentLevel: normalizeLevel(parsed.currentLevel),
        points: normalizePoints(parsed.points),
      };
    } catch {
      return { currentLevel: 0, points: 0 };
    }
  }

  private writeLocal(progress: PlayerProgress): void {
    try {
      this.storage?.setItem(appConfig.platform.progressStorageKey, JSON.stringify(progress));
    } catch {
      // Progress remains available for the active puzzle when storage is unavailable.
    }
  }
}

export const levelProgressStore = new LevelProgressStore();
