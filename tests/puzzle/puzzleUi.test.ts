import { expect, test } from "bun:test";
import { completionMessage, completionModalMarkup } from "../../app/components/puzzle/completionModal";
import { puzzleControlsMarkup } from "../../app/components/puzzle/puzzleControls";
import { targetHintButtonMarkup, targetHintOverlayMarkup } from "../../app/components/puzzle/targetHint";
import { puzzleSceneConfig } from "../../app/config/scenes/puzzleSceneConfig";
import { pointsForCompletion } from "../../app/services/levelProgressStore";

test("maps earned stars to completion messages", () => {
  expect(completionMessage(3)).toBe("Excellent!");
  expect(completionMessage(2)).toBe("Well done!");
  expect(completionMessage(1)).toBe("Puzzle completed!");
});

test("adjusts earned points for grid size and tile shape", () => {
  expect(pointsForCompletion(3, 4, "square", puzzleSceneConfig.scoring)).toBe(300);
  expect(pointsForCompletion(3, 6, "card", puzzleSceneConfig.scoring)).toBe(495);
  expect(pointsForCompletion(3, 8, "verticalHexagon", puzzleSceneConfig.scoring)).toBe(780);
});

test("renders enabled puzzle controls from configuration", () => {
  const markup = puzzleControlsMarkup({
    enabledShapes: [
      { value: "square", weight: 4 },
      { value: "card", weight: 3 },
      { value: "verticalHexagon", weight: 2 },
    ],
    allowImageUpload: true,
    allowShapeSelection: true,
    allowGridSelection: true,
    allowRestart: true,
  });

  expect(markup).toContain("Upload image");
  expect(markup.match(/data-shape=/g)).toHaveLength(3);
  expect(markup).toContain('data-shape="card"');
  expect(markup).not.toContain('data-shape="octagon"');
  expect(markup.match(/data-grid=/g)).toHaveLength(3);
  expect(markup.indexOf("shape-picker")).toBeLessThan(markup.indexOf("grid-picker"));
  expect(markup).toContain("Shuffle puzzle");
});

test("omits disabled puzzle controls", () => {
  expect(puzzleControlsMarkup({
    enabledShapes: [],
    allowImageUpload: false,
    allowShapeSelection: false,
    allowGridSelection: false,
    allowRestart: false,
  })).toBe("");
});

test("renders completion and hold-to-view target hint structure", () => {
  expect(completionModalMarkup({ allowNextLevel: true })).toContain('role="status"');
  expect(completionModalMarkup({ allowNextLevel: true })).toContain("Next puzzle");
  expect(completionModalMarkup({ allowNextLevel: true })).toContain("data-win-points");
  expect(completionModalMarkup({ allowNextLevel: false })).not.toContain("Next puzzle");
  expect(targetHintButtonMarkup()).toContain("<strong>Hint</strong>");
  expect(targetHintButtonMarkup()).toContain("-1");
  expect(targetHintButtonMarkup()).toContain("★");
  expect(targetHintOverlayMarkup()).toContain("target-hint-overlay");
});
