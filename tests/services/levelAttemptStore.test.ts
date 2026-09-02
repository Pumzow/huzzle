import { describe, expect, test } from "bun:test";

import { appConfig } from "../../app/config/appConfig";
import { LevelAttemptStore, type LevelAttemptSnapshot } from "../../app/services/levelAttemptStore";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

const snapshot: LevelAttemptSnapshot = {
  version: 1,
  levelId: 2,
  gridSize: 4,
  tileShape: "square",
  slots: [1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  moves: 3,
  groups: 8,
  startingGroups: 12,
  moveLimit: 10,
  started: true,
  elapsedSeconds: 17,
  hintUsed: true,
};

describe("LevelAttemptStore", () => {
  test("restores only a matching valid level attempt", () => {
    const store = new LevelAttemptStore(memoryStorage());
    store.save(snapshot);

    expect(store.load(2, 4, "square")).toEqual(snapshot);
    expect(store.load(3, 4, "square")).toBeNull();
    expect(store.load(2, 4, "card")).toBeNull();
  });

  test("rejects invalid tile permutations and clears snapshots", () => {
    const storage = memoryStorage();
    const store = new LevelAttemptStore(storage);
    storage.setItem(appConfig.levels.attemptStorageKey, JSON.stringify({
      ...snapshot,
      slots: Array(16).fill(0),
    }));

    expect(store.load(2, 4, "square")).toBeNull();
    store.clear();
    expect(storage.getItem(appConfig.levels.attemptStorageKey)).toBeNull();
  });
});
