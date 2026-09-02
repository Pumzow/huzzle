import { expect, test } from "bun:test";
import { appConfig } from "../../app/config/appConfig";
import { gameConfig } from "../../app/config/gameConfig";

test("defines the supported puzzle sizes and shapes", () => {
  expect(gameConfig.grid.defaultSize).toBe(4);
  expect(gameConfig.grid.sizes).toEqual([4, 6, 8]);
  expect(gameConfig.pieces.defaultShape).toBe("square");
  expect(gameConfig.pieces.shapes).toEqual([
    { value: "square", label: "Square" },
    { value: "card", label: "Card", aspectRatio: 0.75 },
    { value: "hexagon", label: "Hexagon" },
    { value: "verticalHexagon", label: "Vertical hex" },
    { value: "octagon", label: "Octagon" },
  ]);
});

test("defines seamless piece rendering", () => {
  expect(gameConfig.pieces.gap).toBe(0);
});

test("centralizes adjustable puzzle visual effects", () => {
  expect(gameConfig.visualEffects.tileSettle).toMatchObject({
    durationMs: 240,
    peakScale: 1.08,
  });
  expect(gameConfig.visualEffects.connection.durationMs).toBe(680);
  expect(gameConfig.visualEffects.completion).toMatchObject({
    waveDurationMs: 980,
    particleScale: 1.35,
  });
  expect(gameConfig.visualEffects.sceneTransition.durationMs).toBe(320);
  expect(gameConfig.visualEffects.panel.durationMs).toBe(420);
  expect(gameConfig.visualEffects.leaderboard.rowStaggerMs).toBe(48);
  expect(gameConfig.visualEffects.pointsReward.countDurationMs).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.pointsReward.peakScale).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.themeTransition.durationMs).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.buttonFeedback.rippleScale).toBeGreaterThan(1);
  expect(gameConfig.visualEffects.backgroundReaction.completionScale).toBeGreaterThan(1);
});

test("defines independent music and sound-effect preferences", () => {
  expect(appConfig.soundtrack).toMatchObject({
    enabled: true,
    file: "sounds/huzzle-soundtrack.wav",
    loop: true,
    storageKey: "huzzle-music-muted",
  });
  expect(appConfig.sfx.storageKey).toBe("huzzle-sfx-muted");
});
