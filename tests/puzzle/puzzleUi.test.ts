import { expect, test } from "bun:test";
import { completionModalMarkup } from "../../app/components/puzzle/completionModal";
import { puzzleControlsMarkup } from "../../app/components/puzzle/puzzleControls";
import { puzzleHUDMarkup } from "../../app/components/puzzle/puzzleHUD";
import { targetHintButtonMarkup, targetHintOverlayMarkup } from "../../app/components/puzzle/targetHint";
import { gameConfig } from "../../app/config/gameConfig";

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

test("renders completion and rewarded target hint structure", () => {
  expect(completionModalMarkup({ allowNextLevel: true, allowShuffle: false })).toContain('role="status"');
  expect(completionModalMarkup({ allowNextLevel: true, allowShuffle: false })).toContain("Next puzzle");
  expect(completionModalMarkup({ allowNextLevel: true, allowShuffle: false })).toContain("data-win-points");
  expect(completionModalMarkup({ allowNextLevel: true, allowShuffle: false })).toContain("win-burst");
  expect(completionModalMarkup({ allowNextLevel: false, allowShuffle: true })).toContain("Shuffle again");
  expect(completionModalMarkup({ allowNextLevel: false, allowShuffle: true })).not.toContain("Next puzzle");
  expect(targetHintButtonMarkup()).toContain("<strong>Hint</strong>");
  expect(targetHintButtonMarkup()).toContain('data-hint-access');
  expect(targetHintButtonMarkup()).toContain('<rect x="3" y="5"');
  expect(targetHintButtonMarkup()).not.toContain("★");
  expect(targetHintOverlayMarkup()).toContain("target-hint-overlay");
  expect(targetHintOverlayMarkup()).not.toContain("Target image");
});

test("renders the configurable moves and timer intro without gameplay stars", () => {
  const markup = puzzleHUDMarkup({
    showMoves: true,
    showTimer: true,
    showStars: false,
    intro: {
      enabled: true,
      holdDuration: 1,
      transitionDuration: .55,
    },
  });

  expect(markup).toContain("data-hud-intro");
  expect(markup).toContain("data-hud-intro-moves");
  expect(markup).toContain("data-hud-intro-timer");
  expect(markup).not.toContain("star-stat");
});

test("omits the HUD intro when it is disabled", () => {
  const markup = puzzleHUDMarkup({
    showMoves: true,
    showTimer: true,
    showStars: false,
    intro: {
      enabled: false,
      holdDuration: 1,
      transitionDuration: .55,
    },
  });

  expect(markup).not.toContain("data-hud-intro");
});
