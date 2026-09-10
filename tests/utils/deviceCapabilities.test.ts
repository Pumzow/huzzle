import { expect, test } from "bun:test";
import { shouldAnimateThemeTransition } from "../../app/utils/deviceCapabilities";

test("keeps the theme transition on non-touch desktop devices", () => {
  expect(shouldAnimateThemeTransition(false, false, 0)).toBe(true);
});

test("switches themes atomically on coarse-pointer mobile devices", () => {
  expect(shouldAnimateThemeTransition(false, true, 5)).toBe(false);
});

test("switches themes atomically on touch devices even when pointer media queries are inaccurate", () => {
  expect(shouldAnimateThemeTransition(false, false, 1)).toBe(false);
});

test("honors reduced-motion preferences", () => {
  expect(shouldAnimateThemeTransition(true, false, 0)).toBe(false);
});
