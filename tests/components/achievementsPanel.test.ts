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
    expect(markup).toContain("0 / 33");
  });

  test("derives unlocks from level and current point progress", () => {
    const states = achievementProgress(
      {
        currentLevel: 10,
        points: 200,
        totalPoints: 1_200,
        isCheater: false,
      },
      5,
    );

    expect(states.filter(({ unlocked }) => unlocked)).toHaveLength(9);
    expect(states.find(({ name }) => name === "Casual Five")?.percentage).toBe(100);
    expect(states.find(({ name }) => name === "Grid Veteran")?.percentage).toBe(100);
    expect(states.find(({ name }) => name === "Point Starter")?.percentage).toBe(80);
    expect(states.find(({ name }) => name === "Score Legend")?.percentage).toBe(2);
    expect(states.find(({ name }) => name === "Four Digits")?.percentage).toBe(100);
  });

  test("orders completed achievements before the closest unfinished goals", () => {
    const states = achievementProgress({
      currentLevel: 6,
      points: 200,
      totalPoints: 800,
      isCheater: false,
    });

    const firstIncomplete = states.findIndex(({ unlocked }) => !unlocked);
    expect(firstIncomplete).toBe(4);
    expect(states.slice(0, firstIncomplete).every(({ unlocked }) => unlocked))
      .toBe(true);
    expect(states[firstIncomplete]?.percentage).toBe(80);
  });
});
