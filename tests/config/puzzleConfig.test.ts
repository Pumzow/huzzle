import { expect, test } from "bun:test";
import { appConfig } from "../../app/config/appConfig";
import { customPuzzleSceneConfig } from "../../app/config/scenes/customPuzzleSceneConfig";
import { gameIntroSceneConfig } from "../../app/config/scenes/gameIntroSceneConfig";
import { puzzleSceneConfig } from "../../app/config/scenes/puzzleSceneConfig";

test("configures remote images for the standard puzzle", () => {
  expect(typeof appConfig.levels.manifestUrl).toBe("string");
  expect(puzzleSceneConfig.enabledShapes).toEqual([
    { value: "square", weight: 7 },
    { value: "card", weight: 5 },
    { value: "verticalHexagon", weight: 2 },
  ]);
  expect(puzzleSceneConfig.levels).toEqual({
    requestTimeout: 8,
    selectionMode: "sequence",
    gridSizeSequence: [4, 4, 6, 4, 4, 8],
    useLevelIdSeed: true,
  });
  expect(puzzleSceneConfig.scoring).toEqual({
    startingStars: 3,
    pointsPerStar: 100,
    gridSizeMultipliers: { 4: 1, 6: 1.5, 8: 2 },
    tileShapeMultipliers: {
      square: 1,
      card: 1.1,
      hexagon: 1.3,
      verticalHexagon: 1.3,
      octagon: 1.1,
    },
    baseTime: 20,
    secondsPerStartingSet: 7,
    moveAllowanceMultiplier: 0.5,
    minimumFreeMoves: 4,
  });
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
  expect(customPuzzleSceneConfig.enabledShapes).toEqual([
    { value: "square" },
    { value: "card" },
    { value: "verticalHexagon" },
  ]);
  expect(customPuzzleSceneConfig.scoring.pointsPerStar).toBe(100);
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
  expect(gameIntroSceneConfig).toEqual({
    touchPrompt: "Tap to start",
    pointerPrompt: "Click or press any key to start",
  });
});
