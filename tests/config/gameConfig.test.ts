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
    duration: 0.24,
    peakScale: 1.08,
  });
  expect(gameConfig.visualEffects.connection.duration).toBe(0.68);
  expect(gameConfig.visualEffects.completion).toMatchObject({
    wave: {
      delayBeforeStart: 0,
      duration: 0.98,
    },
    modal: {
      delayBeforeShow: 0.4,
      duration: 0.35,
    },
    stars: {
      delays: {
        beforeFirstShow: 0.4,
        betweenShows: 0.28,
      },
      peakScale: 1.42,
    },
    message: {
      delayBeforeShow: 1,
      duration: 0.42,
    },
    points: {
      delayBeforeShow: 1.5,
      countDuration: 1,
    },
    actions: {
      delays: {
        beforeShow: 3,
        beforeShowWithoutPoints: 2.34,
      },
    },
    particles: {
      delays: {
        beforeFirstShow: 1,
        betweenShows: 0.02,
      },
      scale: 1.35,
    },
  });
  expect(gameConfig.visualEffects.sceneTransition.duration).toBe(0.32);
  expect(gameConfig.visualEffects.panel.duration).toBe(0.42);
  expect(gameConfig.visualEffects.leaderboard.rowStagger).toBe(0.048);
  expect(gameConfig.visualEffects.completion.points.countDuration).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.completion.points.peakScale).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.themeTransition.duration).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.buttonFeedback.rippleScale).toBeGreaterThan(1);
  expect(gameConfig.visualEffects.backgroundReaction.completionScale).toBeGreaterThan(1);
  expect(gameConfig.visualEffects.backgroundReaction.blurPx).toBe(58);
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
