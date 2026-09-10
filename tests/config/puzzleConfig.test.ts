import { expect, test } from "bun:test";
import { huzzle } from "drygon-huzzle-rules";
import { appConfig } from "../../app/config/appConfig";
import { customPuzzleSceneConfig } from "../../app/config/scenes/customPuzzleSceneConfig";
import { gameIntroSceneConfig } from "../../app/config/scenes/gameIntroSceneConfig";
import { puzzleSceneConfig } from "../../app/config/scenes/puzzleSceneConfig";

test("configures remote images for the standard puzzle", () => {
  expect(typeof appConfig.levels.manifestUrl).toBe("string");
  expect(puzzleSceneConfig.enabledShapes.length).toBeGreaterThan(0);
  expect(puzzleSceneConfig.enabledShapes.every(({ weight }) => weight === undefined || weight > 0)).toBe(true);
  expect(puzzleSceneConfig.levels.gridSizeSequence).toBe(huzzle.config.gridSizeSequence);
  expect(puzzleSceneConfig.scoring.startingStars).toBe(huzzle.config.maximumStars);
  expect(puzzleSceneConfig.scoring.pointsPerStar).toBe(huzzle.config.pointsPerStar);
  expect(puzzleSceneConfig.scoring.gridSizeMultipliers).toBe(huzzle.config.gridSizeMultipliers);
  expect(puzzleSceneConfig.scoring.tileShapeMultipliers).toBe(huzzle.config.tileShapeMultipliers);
  expect(puzzleSceneConfig.components.hud).toEqual({
    enabled: true,
    showMoves: true,
    showTimer: true,
    showStars: true,
  });
  expect(puzzleSceneConfig.components.targetHint).toEqual({ enabled: true, allowUse: true });
  expect(puzzleSceneConfig.components.controls.allowRestart).toBe(false);
});

test("configures custom puzzles around uploads and controls", () => {
  expect(customPuzzleSceneConfig.enabledShapes.length).toBeGreaterThan(0);
  expect(customPuzzleSceneConfig.components.controls).toEqual({
    enabled: true,
    allowImageUpload: true,
    allowShapeSelection: true,
    allowGridSelection: true,
    allowRestart: true,
  });
  expect(customPuzzleSceneConfig.components.targetHint.enabled).toBe(false);
});

test("provides input-specific intro prompts", () => {
  expect(gameIntroSceneConfig.loadingPrompt.trim().length).toBeGreaterThan(0);
  expect(gameIntroSceneConfig.touchPrompt).not.toBe(gameIntroSceneConfig.pointerPrompt);
  expect(gameIntroSceneConfig.minimumLoading).toBeGreaterThanOrEqual(0);
  expect(gameIntroSceneConfig.maximumAdsWait).toBeGreaterThanOrEqual(gameIntroSceneConfig.minimumLoading);
});
