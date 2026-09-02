import { appConfig } from "../config/appConfig";
import { huzzle } from "drygon-huzzle-rules";
import type { GridSize, TileShapeTypes } from "../types/gameTypes";
import { platformApi, type HuzzleCompletion, type HuzzleProgress } from "./platformApi";
import { platformSession } from "./platformSession";

type ProgressApi = {
  getHuzzleProgress(token: string): Promise<HuzzleProgress>;
  saveHuzzleProgress(token: string, currentLevel: number, points: number, totalPoints: number): Promise<HuzzleProgress>;
  completeHuzzleLevel(
    token: string,
    currentLevel: number,
    stars: number,
    gridSize: GridSize,
    tileShape: TileShapeTypes,
  ): Promise<HuzzleCompletion>;
};

type ProgressSession = {
  readonly authenticationToken: string | null;
  whenReady?(): Promise<void>;
};

type ProgressStorage = Pick<Storage, "getItem" | "setItem">;

export type PlayerProgress = {
  currentLevel: number;
  points: number;
  totalPoints: number;
  isCheater: boolean;
};

export type LevelCompletion = PlayerProgress & {
  pointsAwarded: number;
};

type StoredPlayerProgress = PlayerProgress & {
  weekStart: string;
};

function publicProgress(progress: StoredPlayerProgress): PlayerProgress {
  return {
    currentLevel: progress.currentLevel,
    points: progress.points,
    totalPoints: progress.totalPoints,
    isCheater: progress.isCheater,
  };
}

function normalizeLevel(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function normalizePoints(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function currentUtcWeekStart(now = new Date()): string {
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
  ));
  return monday.toISOString().slice(0, 10);
}

function browserStorage(): ProgressStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class LevelProgressStore {
  private latestProgress: PlayerProgress = {
    currentLevel: 0,
    points: 0,
    totalPoints: 0,
    isCheater: false,
  };

  constructor(
    private readonly api: ProgressApi = platformApi,
    private readonly session: ProgressSession = platformSession,
    private readonly storage: ProgressStorage | null = browserStorage(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  get isCheater(): boolean {
    return this.latestProgress.isCheater;
  }

  private remember(progress: PlayerProgress): PlayerProgress {
    this.latestProgress = progress;
    return progress;
  }

  async load(): Promise<PlayerProgress> {
    const localProgress = this.readLocal();
    try {
      return await this.syncAuthenticated();
    } catch {
      return this.remember(publicProgress(localProgress));
    }
  }

  async syncAuthenticated(): Promise<PlayerProgress> {
    const localProgress = this.readLocal();
    await this.session.whenReady?.();
    const token = this.session.authenticationToken;
    if (!token) return this.remember(publicProgress(localProgress));

    const serverProgress = await this.api.getHuzzleProgress(token);
    const serverWeekStart = serverProgress.weekStart ?? currentUtcWeekStart(this.now());
    const localPoints = localProgress.weekStart === serverWeekStart ? localProgress.points : 0;
    const server = {
      currentLevel: normalizeLevel(serverProgress.currentLevel),
      points: normalizePoints(serverProgress.points),
      totalPoints: normalizePoints(serverProgress.totalPoints ?? serverProgress.points),
      isCheater: serverProgress.isCheater === true,
    };
    const merged = {
      currentLevel: Math.max(server.currentLevel, localProgress.currentLevel),
      points: Math.max(server.points, localPoints),
      totalPoints: Math.max(server.totalPoints, localProgress.totalPoints),
      isCheater: server.isCheater,
    };
    if (
      merged.currentLevel > server.currentLevel ||
      merged.points > server.points ||
      merged.totalPoints > server.totalPoints
    ) {
      const saved = await this.api.saveHuzzleProgress(
        token,
        merged.currentLevel,
        merged.points,
        merged.totalPoints,
      );
      return this.remember({
        currentLevel: normalizeLevel(saved.currentLevel),
        points: normalizePoints(saved.points),
        totalPoints: normalizePoints(saved.totalPoints ?? saved.points),
        isCheater: saved.isCheater === true,
      });
    }
    return this.remember(merged);
  }

  async complete(
    currentLevel: number,
    stars: number,
    gridSize: GridSize,
    tileShape: TileShapeTypes,
  ): Promise<LevelCompletion> {
    const level = normalizeLevel(currentLevel);
    const token = this.session.authenticationToken;
    if (token) {
      try {
        const completion = await this.api.completeHuzzleLevel(token, level, stars, gridSize, tileShape);
        const completed = {
          currentLevel: normalizeLevel(completion.currentLevel),
          points: normalizePoints(completion.points),
          totalPoints: normalizePoints(completion.totalPoints ?? completion.points),
          isCheater: completion.isCheater === true,
          pointsAwarded: normalizePoints(completion.pointsAwarded),
        };
        this.remember(completed);
        return completed;
      } catch {
        return this.completeLocally(level, stars, gridSize, tileShape);
      }
    }
    return this.completeLocally(level, stars, gridSize, tileShape);
  }

  private completeLocally(
    currentLevel: number,
    stars: number,
    gridSize: GridSize,
    tileShape: TileShapeTypes,
  ): LevelCompletion {
    const progress = this.readLocal();
    const pointsAwarded = currentLevel > progress.currentLevel
      ? huzzle.utils.pointsForCompletion(stars, gridSize, tileShape)
      : 0;
    const completed = {
      currentLevel: Math.max(progress.currentLevel, currentLevel),
      points: progress.points + pointsAwarded,
      totalPoints: progress.totalPoints + pointsAwarded,
      isCheater: false,
    };
    this.writeLocal(completed);
    this.remember(completed);
    return { ...completed, pointsAwarded };
  }

  private readLocal(): StoredPlayerProgress {
    const weekStart = currentUtcWeekStart(this.now());
    if (!this.storage) return { currentLevel: 0, points: 0, totalPoints: 0, isCheater: false, weekStart };
    try {
      const stored = this.storage.getItem(appConfig.platform.progressStorageKey);
      if (!stored) return { currentLevel: 0, points: 0, totalPoints: 0, isCheater: false, weekStart };
      const legacyLevel = Number(stored);
      if (Number.isFinite(legacyLevel)) {
        return { currentLevel: normalizeLevel(legacyLevel), points: 0, totalPoints: 0, isCheater: false, weekStart };
      }
      const parsed = JSON.parse(stored) as Partial<StoredPlayerProgress>;
      const storedWeekStart = typeof parsed.weekStart === "string"
        ? parsed.weekStart
        : weekStart;
      return {
        currentLevel: normalizeLevel(parsed.currentLevel),
        points: storedWeekStart === weekStart ? normalizePoints(parsed.points) : 0,
        totalPoints: normalizePoints(parsed.totalPoints ?? parsed.points),
        isCheater: false,
        weekStart,
      };
    } catch {
      return { currentLevel: 0, points: 0, totalPoints: 0, isCheater: false, weekStart };
    }
  }

  private writeLocal(progress: PlayerProgress): void {
    try {
      this.storage?.setItem(appConfig.platform.progressStorageKey, JSON.stringify({
        ...progress,
        weekStart: currentUtcWeekStart(this.now()),
      }));
    } catch {
      // Progress remains available for the active puzzle when storage is unavailable.
    }
  }
}

export const levelProgressStore = new LevelProgressStore();
