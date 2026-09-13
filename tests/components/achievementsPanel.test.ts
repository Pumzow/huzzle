import { describe, expect, test } from "bun:test";

import {
  achievementProgress,
  achievementsPanelMarkup,
} from "../../app/components/panels/achievementsPanel";

describe("achievements panel", () => {
  test("renders a main-menu trigger and achievements dialog", () => {
    const markup = achievementsPanelMarkup();

    expect(markup).toContain("achievements-trigger");
    expect(markup).toContain("achievements-dialog");
    expect(markup).toContain("Achievements");
  });

  test("derives unlocks from level and current point progress", () => {
    const states = achievementProgress({
      currentLevel: 10,
      points: 200,
      totalPoints: 1_200,
      isCheater: false,
    });

    expect(states.filter(({ unlocked }) => unlocked)).toHaveLength(3);
    expect(states.find(({ name }) => name === "Grid Veteran")?.percentage).toBe(100);
    expect(states.find(({ name }) => name === "Point Starter")?.percentage).toBe(80);
    expect(states.find(({ name }) => name === "Score Legend")?.percentage).toBe(2);
  });

  test("orders completed achievements before the closest unfinished goals", () => {
    const states = achievementProgress({
      currentLevel: 6,
      points: 200,
      totalPoints: 800,
      isCheater: false,
    });

    expect(states.slice(0, 2).map(({ name }) => name)).toEqual([
      "First Connection",
      "Puzzle Apprentice",
    ]);
    expect(states[2]?.name).toBe("Point Starter");
    expect(states[2]?.percentage).toBe(80);
  });
});
