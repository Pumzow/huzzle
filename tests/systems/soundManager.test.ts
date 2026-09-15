import { expect, test } from "bun:test";
import { randomPlaybackRate } from "../../app/systems/soundManager";

test("selects a playback rate inside the configured pitch range", () => {
  const range = { min: 0.9, max: 1.1 };

  expect(randomPlaybackRate(range, () => 0)).toBeCloseTo(0.9);
  expect(randomPlaybackRate(range, () => 0.5)).toBeCloseTo(1);
  expect(randomPlaybackRate(range, () => 1)).toBeCloseTo(1.1);
});

test("uses normal playback speed when no pitch range is configured", () => {
  expect(randomPlaybackRate(undefined, () => 0)).toBe(1);
});
