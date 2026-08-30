import { expect, test } from "bun:test";
import { appConfig } from "../../app/config/appConfig";
import { customPuzzleSceneConfig } from "../../app/config/scenes/customPuzzleSceneConfig";
import { gameIntroSceneConfig } from "../../app/config/scenes/gameIntroSceneConfig";
import { puzzleSceneConfig } from "../../app/config/scenes/puzzleSceneConfig";

test("configures remote images for the standard puzzle", () => {
  expect(typeof appConfig.levels.manifestUrl).toBe("string");
  expect(puzzleSceneConfig.levels).toEqual({
    requestTimeoutMs: 8000,
    selectionMode: "sequence",
  });
  expect(puzzleSceneConfig.components.hud).toEqual({
    enabled: true,
    showMoves: true,
    showTimer: true,
    showStars: true,
  });
  expect(puzzleSceneConfig.components.targetHint).toEqual({ enabled: true, allowUse: true });
});

test("configures custom puzzles around uploads and controls", () => {
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
