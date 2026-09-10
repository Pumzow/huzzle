import { expect, test } from "bun:test";
import { completionMessage, completionModalMarkup, completionPointsMessage } from "../../app/components/puzzle/completionModal";
import { puzzleControlsMarkup } from "../../app/components/puzzle/puzzleControls";
import { targetHintButtonMarkup, targetHintOverlayMarkup } from "../../app/components/puzzle/targetHint";
import { gameConfig } from "../../app/config/gameConfig";

test("maps earned stars to completion messages", () => {
  expect(completionMessage(3)).toBe("Excellent!");
  expect(completionMessage(2)).toBe("Well done!");
  expect(completionMessage(1)).toBe("Puzzle completed!");
});

test("replaces completion points for flagged players", () => {
  expect(completionPointsMessage(300, false)).toBe("+300 points");
  expect(completionPointsMessage(0, true)).toBe("No points for cheaters");
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
  expect(markup).toContain('data-grid-size type="number"');
  expect(markup).toContain(`min="${gameConfig.grid.minSize}" max="${gameConfig.grid.maxSize}" step="1"`);
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
  expect(completionModalMarkup({ allowNextLevel: true, allowShuffle: false })).toContain('role="status"');
  expect(completionModalMarkup({ allowNextLevel: true, allowShuffle: false })).toContain("Next puzzle");
  expect(completionModalMarkup({ allowNextLevel: true, allowShuffle: false })).toContain("data-win-points");
  expect(completionModalMarkup({ allowNextLevel: true, allowShuffle: false })).toContain("win-burst");
  expect(completionModalMarkup({ allowNextLevel: false, allowShuffle: true })).toContain("Shuffle again");
  expect(completionModalMarkup({ allowNextLevel: false, allowShuffle: true })).not.toContain("Next puzzle");
  expect(targetHintButtonMarkup()).toContain("<strong>Hint</strong>");
  expect(targetHintButtonMarkup()).toContain("-1");
  expect(targetHintButtonMarkup()).toContain("★");
  expect(targetHintOverlayMarkup()).toContain("target-hint-overlay");
});
