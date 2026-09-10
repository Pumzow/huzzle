import { describe, expect, test } from "bun:test";
import { appConfig } from "../../app/config/appConfig";
import { OfflineLevelStore } from "../../app/services/offlineLevelStore";

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(appConfig.levels.offlineProgressStorageKey, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("OfflineLevelStore", () => {
  test("starts at the first offline level and persists completion", () => {
    const storage = memoryStorage();
    const store = new OfflineLevelStore(storage);
    expect(store.currentLevel).toBe(0);
    expect(store.complete(0)).toBe(1);
    expect(new OfflineLevelStore(storage).currentLevel).toBe(1);
  });

  test("never moves progression backwards", () => {
    const store = new OfflineLevelStore(memoryStorage("8"));
    expect(store.complete(3)).toBe(8);
    expect(store.complete(8)).toBe(9);
  });

  test("keeps the debug override in memory", () => {
    const storage = memoryStorage();
    const store = new OfflineLevelStore(storage);
    store.setDebugForced(true);
    expect(store.isDebugForced).toBe(true);
    expect(storage.getItem(appConfig.levels.offlineProgressStorageKey)).toBeNull();
  });
});
