import { expect, test } from "bun:test";
import {
  boardAspectFor,
  puzzleLevelLabel,
} from "../../app/layouts/puzzleSceneLayout";

test("calculates board aspect ratios for each puzzle layout", () => {
  expect(boardAspectFor("square", 4)).toBe(1);
  expect(boardAspectFor("card", 4)).toBe(0.75);
  expect(boardAspectFor("hexagon", 4)).toBeLessThan(1);
  expect(boardAspectFor("verticalHexagon", 4)).toBeGreaterThan(1);
  expect(boardAspectFor("octagon", 4)).toBe(1);
});

test("formats puzzle levels without exposing the selected mode", () => {
  expect(puzzleLevelLabel(undefined)).toBe("Level …");
  expect(puzzleLevelLabel(0)).toBe("Level 1");
  expect(puzzleLevelLabel(14)).toBe("Level 15");
});
