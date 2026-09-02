import { describe, expect, test } from "bun:test";

import { appConfig } from "../../app/config/appConfig";
import { LevelProgressStore } from "../../app/services/levelProgressStore";

function memoryStorage(initialLevel?: number, initialPoints = 0, weekStart?: string) {
  const values = new Map<string, string>();
  if (initialLevel !== undefined) {
    values.set(
      appConfig.platform.progressStorageKey,
      initialPoints > 0 || weekStart
        ? JSON.stringify({ currentLevel: initialLevel, points: initialPoints, weekStart })
        : String(initialLevel),
    );
  }
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("LevelProgressStore", () => {
  test("migrates legacy guest progress and awards points once", async () => {
    const storage = memoryStorage(2);
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({ currentLevel: 0, points: 0 }),
        saveHuzzleProgress: async () => ({ currentLevel: 0, points: 0 }),
        completeHuzzleLevel: async () => ({ currentLevel: 0, points: 0, pointsAwarded: 0 }),
      },
      { authenticationToken: null },
      storage,
    );

    expect(await store.load()).toEqual({ currentLevel: 2, points: 0, totalPoints: 0, isCheater: false });
    expect(await store.complete(3, 2, 6, "card")).toEqual({ currentLevel: 3, points: 330, totalPoints: 330, isCheater: false, pointsAwarded: 330 });
    expect(await store.complete(3, 3, 6, "card")).toEqual({ currentLevel: 3, points: 330, totalPoints: 330, isCheater: false, pointsAwarded: 0 });
    expect(await store.load()).toEqual({ currentLevel: 3, points: 330, totalPoints: 330, isCheater: false });
  });

  test("uses server progress for authenticated players", async () => {
    const completed: Array<{ level: number; stars: number; gridSize: number; tileShape: string }> = [];
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({ currentLevel: 4, points: 700 }),
        saveHuzzleProgress: async (_token, level, points) => ({ currentLevel: level, points }),
        completeHuzzleLevel: async (_token, level, stars, gridSize, tileShape) => {
          completed.push({ level, stars, gridSize, tileShape });
          return { currentLevel: level, points: 1000, pointsAwarded: 300 };
        },
      },
      { authenticationToken: "jwt" },
      memoryStorage(),
    );

    expect(await store.load()).toEqual({ currentLevel: 4, points: 700, totalPoints: 700, isCheater: false });
    expect(await store.complete(5, 3, 8, "verticalHexagon")).toEqual({ currentLevel: 5, points: 1000, totalPoints: 1000, isCheater: false, pointsAwarded: 300 });
    expect(completed).toEqual([{ level: 5, stars: 3, gridSize: 8, tileShape: "verticalHexagon" }]);
  });

  test("merges higher guest progress into the authenticated profile", async () => {
    const saved: Array<{ level: number; points: number; totalPoints: number }> = [];
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({ currentLevel: 2, points: 500 }),
        saveHuzzleProgress: async (_token, level, points, totalPoints) => {
          saved.push({ level, points, totalPoints });
          return { currentLevel: level, points, totalPoints };
        },
        completeHuzzleLevel: async () => ({ currentLevel: 0, points: 0, pointsAwarded: 0 }),
      },
      { authenticationToken: "jwt" },
      memoryStorage(6, 900),
    );

    expect(await store.syncAuthenticated()).toEqual({ currentLevel: 6, points: 900, totalPoints: 900, isCheater: false });
    expect(saved).toEqual([{ level: 6, points: 900, totalPoints: 900 }]);
  });

  test("keeps local progress available when server loading fails", async () => {
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => { throw new Error("offline"); },
        saveHuzzleProgress: async (_token, level, points) => ({ currentLevel: level, points }),
        completeHuzzleLevel: async () => { throw new Error("offline"); },
      },
      { authenticationToken: "jwt" },
      memoryStorage(5),
    );

    expect(await store.load()).toEqual({ currentLevel: 5, points: 0, totalPoints: 0, isCheater: false });
    await expect(store.syncAuthenticated()).rejects.toThrow("offline");
  });

  test("resets local points on Monday while keeping level progress", async () => {
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({ currentLevel: 0, points: 0 }),
        saveHuzzleProgress: async () => ({ currentLevel: 0, points: 0 }),
        completeHuzzleLevel: async () => ({ currentLevel: 0, points: 0, pointsAwarded: 0 }),
      },
      { authenticationToken: null },
      memoryStorage(8, 1400, "2026-08-24"),
      () => new Date("2026-08-31T00:00:00.000Z"),
    );

    expect(await store.load()).toEqual({ currentLevel: 8, points: 0, totalPoints: 1400, isCheater: false });
  });

  test("keeps a server cheater flag in the active progress", async () => {
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({
          currentLevel: 3,
          points: 700,
          totalPoints: 50_000,
          isCheater: true,
        }),
        saveHuzzleProgress: async () => ({ currentLevel: 3, points: 700, totalPoints: 50_000, isCheater: true }),
        completeHuzzleLevel: async () => ({ currentLevel: 4, points: 700, totalPoints: 50_000, isCheater: true, pointsAwarded: 0 }),
      },
      { authenticationToken: "jwt" },
      memoryStorage(),
    );

    expect(await store.load()).toEqual({ currentLevel: 3, points: 700, totalPoints: 50_000, isCheater: true });
    expect(store.isCheater).toBe(true);
  });

  test("waits for session restoration before choosing storage", async () => {
    let restored = false;
    const session = {
      get authenticationToken() { return restored ? "jwt" : null; },
      whenReady: async () => { restored = true; },
    };
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({ currentLevel: 7, points: 1200 }),
        saveHuzzleProgress: async (_token, level, points) => ({ currentLevel: level, points }),
        completeHuzzleLevel: async () => ({ currentLevel: 0, points: 0, pointsAwarded: 0 }),
      },
      session,
      memoryStorage(1),
    );

    expect(await store.load()).toEqual({ currentLevel: 7, points: 1200, totalPoints: 1200, isCheater: false });
  });
});
