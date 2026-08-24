import { expect, test } from "bun:test";
import { completionMessage, completionModalMarkup } from "../../app/components/puzzle/completionModal";
import { puzzleControlsMarkup } from "../../app/components/puzzle/puzzleControls";
import { targetPreviewMarkup } from "../../app/components/puzzle/targetPreview";

test("maps earned stars to completion messages", () => {
  expect(completionMessage(3)).toBe("Excellent!");
  expect(completionMessage(2)).toBe("Well done!");
  expect(completionMessage(1)).toBe("Puzzle completed!");
});

test("renders enabled puzzle controls from configuration", () => {
  const markup = puzzleControlsMarkup({
    allowImageUpload: true,
    allowShapeSelection: true,
    allowGridSelection: true,
    allowRestart: true,
  });

  expect(markup).toContain("Upload image");
  expect(markup.match(/data-shape=/g)).toHaveLength(4);
  expect(markup.match(/data-grid=/g)).toHaveLength(3);
  expect(markup.indexOf("shape-picker")).toBeLessThan(markup.indexOf("grid-picker"));
  expect(markup).toContain("Shuffle puzzle");
});

test("omits disabled puzzle controls", () => {
  expect(puzzleControlsMarkup({
    allowImageUpload: false,
    allowShapeSelection: false,
    allowGridSelection: false,
    allowRestart: false,
  })).toBe("");
});

test("renders completion and target-preview accessibility structure", () => {
  expect(completionModalMarkup()).toContain('role="status"');
  expect(targetPreviewMarkup()).toContain("Reveal target");
  expect(targetPreviewMarkup()).toContain("−★");
});
