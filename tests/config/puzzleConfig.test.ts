import { expect, test } from "bun:test";
import { customPuzzleSceneConfig } from "../../app/config/scenes/customPuzzleSceneConfig";
import { gameIntroSceneConfig } from "../../app/config/scenes/gameIntroSceneConfig";
import { puzzleSceneConfig } from "../../app/config/scenes/puzzleSceneConfig";

test("configures remote images for the standard puzzle", () => {
  expect(puzzleSceneConfig.randomImages).toEqual({
    levelsUrl: "https://pi-dev.com/files/huzzle/levels.json",
    imageBaseUrl: "https://pi-dev.com/files/huzzle/images/",
    requestTimeoutMs: 8000,
  });
  expect(puzzleSceneConfig.components.hud).toEqual({
    enabled: true,
    showMoves: true,
    showTimer: true,
    showStars: true,
  });
  expect(puzzleSceneConfig.components.targetPreview).toEqual({ enabled: true, allowReveal: true });
});

test("configures custom puzzles around uploads and controls", () => {
  expect(customPuzzleSceneConfig.components.controls).toEqual({
    enabled: true,
    allowImageUpload: true,
    allowShapeSelection: true,
    allowGridSelection: true,
    allowRestart: true,
  });
  expect(customPuzzleSceneConfig.components.targetPreview.enabled).toBe(false);
});

test("provides input-specific intro prompts", () => {
  expect(gameIntroSceneConfig).toEqual({
    touchPrompt: "Tap to start",
    pointerPrompt: "Click or press any key to start",
  });
});
