import { expect, test } from "bun:test";
import { appConfig } from "../../app/config/appConfig";
import { gameConfig } from "../../app/config/gameConfig";

test("defines the supported puzzle sizes and shapes", () => {
  expect(gameConfig.grid.minSize).toBeLessThanOrEqual(gameConfig.grid.defaultSize);
  expect(gameConfig.grid.maxSize).toBeGreaterThanOrEqual(gameConfig.grid.defaultSize);
  expect(gameConfig.grid.sizes).toContain(gameConfig.grid.defaultSize);
  expect(gameConfig.grid.sizes.every(Number.isInteger)).toBe(true);
  expect(gameConfig.grid.sizes.every((size) => size >= gameConfig.grid.minSize && size <= gameConfig.grid.maxSize)).toBe(true);

  const shapeValues = gameConfig.pieces.shapes.map(({ value }) => value);
  expect(shapeValues).toContain(gameConfig.pieces.defaultShape);
  expect(new Set(shapeValues).size).toBe(shapeValues.length);
  expect(gameConfig.pieces.shapes.every(({ label }) => label.trim().length > 0)).toBe(true);
});

test("defines seamless piece rendering", () => {
  expect(gameConfig.pieces.gap).toBe(0);
});

test("defines usable puzzle visual effects", () => {
  expect(gameConfig.visualEffects.tileSettle.duration).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.connection.duration).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.completion.wave.duration).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.completion.modal.duration).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.completion.points.countDuration).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.completion.points.peakScale).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.themeTransition.duration).toBeGreaterThan(0);
  expect(gameConfig.visualEffects.buttonFeedback.rippleScale).toBeGreaterThan(1);
  expect(gameConfig.visualEffects.backgroundReaction.completionScale).toBeGreaterThan(1);
});

test("defines independent music and sound-effect preferences", () => {
  expect(appConfig.soundtrack.file.trim().length).toBeGreaterThan(0);
  expect(appConfig.soundtrack.storageKey).not.toBe(appConfig.sfx.storageKey);
});

test("uses a subtle device impact when puzzle tiles connect", () => {
  expect(gameConfig.deviceFeedback.connectionImpact).toBe("light");
  expect(gameConfig.deviceFeedback.largeConnectionImpact).toBe("medium");
  expect(gameConfig.deviceFeedback.largeConnectionMinimumTiles).toBeGreaterThan(1);
  expect(gameConfig.deviceFeedback.completionImpact).toBe("heavy");
  expect(gameConfig.deviceFeedback.perfectCompletionDelayMs).toBeGreaterThan(0);
  expect(gameConfig.deviceFeedback.vibrationDurationMs.light)
    .toBeLessThan(gameConfig.deviceFeedback.vibrationDurationMs.medium);
  expect(gameConfig.deviceFeedback.vibrationDurationMs.medium)
    .toBeLessThan(gameConfig.deviceFeedback.vibrationDurationMs.heavy);
});

test("shows an interstitial after every two completed levels", () => {
  expect(appConfig.ads.interstitial.everyCompletedLevels).toBe(2);
});

test("uses Google's sample ad units while ad testing is enabled", () => {
  if (!appConfig.ads.android.testing) return;
  expect(appConfig.ads.android.bannerId).toBe(
    "ca-app-pub-3940256099942544/9214589741",
  );
  expect(appConfig.ads.android.interstitialId).toBe(
    "ca-app-pub-3940256099942544/1033173712",
  );
});
