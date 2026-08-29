import { describe, expect, test } from "bun:test";

import { appConfig } from "../../app/config/appConfig";
import { LevelProgressStore } from "../../app/services/levelProgressStore";

function memoryStorage(initialLevel?: number) {
  const values = new Map<string, string>();
  if (initialLevel !== undefined) {
    values.set(appConfig.platform.progressStorageKey, String(initialLevel));
  }
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("LevelProgressStore", () => {
  test("loads and advances guest progress in local storage", async () => {
    const storage = memoryStorage(2);
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({ currentLevel: 0, highestUnlocked: 0 }),
        saveHuzzleProgress: async () => ({ currentLevel: 0, highestUnlocked: 0 }),
      },
      { authenticationToken: null },
      storage,
    );

    expect(await store.load()).toBe(2);
    await store.save(3);
    await store.save(1);
    expect(await store.load()).toBe(3);
  });

  test("uses server progress for authenticated players", async () => {
    const saved: number[] = [];
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({ currentLevel: 4, highestUnlocked: 4 }),
        saveHuzzleProgress: async (_token, level) => {
          saved.push(level);
          return { currentLevel: level, highestUnlocked: level };
        },
      },
      { authenticationToken: "jwt" },
      memoryStorage(),
    );

    expect(await store.load()).toBe(4);
    await store.save(5);
    expect(saved).toEqual([5]);
  });

  test("merges higher guest progress into the authenticated profile", async () => {
    const saved: number[] = [];
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({ currentLevel: 2, highestUnlocked: 2 }),
        saveHuzzleProgress: async (_token, level) => {
          saved.push(level);
          return { currentLevel: level, highestUnlocked: level };
        },
      },
      { authenticationToken: "jwt" },
      memoryStorage(6),
    );

    expect(await store.syncAuthenticated()).toBe(6);
    expect(saved).toEqual([6]);
  });

  test("keeps local progress available when server loading fails", async () => {
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => { throw new Error("offline"); },
        saveHuzzleProgress: async (_token, level) => ({ currentLevel: level, highestUnlocked: level }),
      },
      { authenticationToken: "jwt" },
      memoryStorage(5),
    );

    expect(await store.load()).toBe(5);
    await expect(store.syncAuthenticated()).rejects.toThrow("offline");
  });

  test("waits for session restoration before choosing storage", async () => {
    let restored = false;
    const session = {
      get authenticationToken() { return restored ? "jwt" : null; },
      whenReady: async () => { restored = true; },
    };
    const store = new LevelProgressStore(
      {
        getHuzzleProgress: async () => ({ currentLevel: 7, highestUnlocked: 7 }),
        saveHuzzleProgress: async (_token, level) => ({ currentLevel: level, highestUnlocked: level }),
      },
      session,
      memoryStorage(1),
    );

    expect(await store.load()).toBe(7);
  });
});
