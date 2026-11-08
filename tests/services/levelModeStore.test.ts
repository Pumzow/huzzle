import { describe, expect, test } from "bun:test";
import { appConfig } from "../../app/config/appConfig";
import { LevelModeStore } from "../../app/services/levelModeStore";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

const config = {
  default: "casual" as const,
  challengeUnlock: {
    enabled: true,
    requiredCasualLevels: 3,
  },
};

describe("LevelModeStore", () => {
  test("unlocks Challenge after the configured number of Casual levels", () => {
    const progress = { currentLevel: 0 };
    const store = new LevelModeStore(memoryStorage(), progress, config);

    expect(store.current).toBe("casual");
    expect(store.challengeUnlockProgress).toBe(0);
    expect(store.select("challenge")).toBe(false);

    progress.currentLevel = 3;
    expect(store.challengeUnlocked).toBe(true);
    expect(store.challengeUnlockProgress).toBe(3);
    expect(store.select("challenge")).toBe(true);
    expect(store.current).toBe("challenge");
  });

  test("persists mode selection and one-time onboarding notices", () => {
    const storage = memoryStorage();
    const progress = { currentLevel: 3 };
    const store = new LevelModeStore(storage, progress, config);

    store.select("challenge");
    store.markHowToPlaySeen();
    store.markChallengeUnlockNoticeSeen();

    const restored = new LevelModeStore(storage, progress, config);
    expect(restored.current).toBe("challenge");
    expect(restored.hasSeenHowToPlay).toBe(true);
    expect(restored.shouldShowChallengeUnlockNotice).toBe(false);
    expect(storage.getItem(appConfig.levels.modeStorageKey)).toBe("challenge");
  });

  test("reports a pending unlock notice only after Challenge is available", () => {
    const progress = { currentLevel: 2 };
    const store = new LevelModeStore(memoryStorage(), progress, config);

    expect(store.shouldShowChallengeUnlockNotice).toBe(false);
    progress.currentLevel = 3;
    expect(store.shouldShowChallengeUnlockNotice).toBe(true);
  });
});

