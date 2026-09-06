import { expect, test } from "bun:test";
import { gsap } from "gsap";

import { bangUp } from "../../app/effects/bangUp";
import {
  toCssSeconds,
  toMilliseconds,
  toSeconds,
  wait,
} from "../../app/utils/time";

test("converts time at browser API boundaries", () => {
  expect(toMilliseconds(1.25)).toBe(1250);
  expect(toSeconds(1250)).toBe(1.25);
  expect(toCssSeconds(0.32)).toBe("0.32s");
});

test("wait accepts seconds", async () => {
  const startedAt = performance.now();
  await wait(0.01);
  expect(performance.now() - startedAt).toBeGreaterThanOrEqual(5);
});

test("bangUp adds impact, recoil, and ring animations to a timeline", () => {
  const target = { filter: "", rotation: 0, scale: 1 };
  const ring = { autoAlpha: 0, scale: 1 };
  const timeline = gsap.timeline({ paused: true });

  expect(
    bangUp(target, {
      at: 1,
      duration: 0.5,
      peakScale: 1.3,
      ring,
      timeline,
    })
  ).toBe(timeline);
  expect(timeline.getChildren(false, true, false)).toHaveLength(3);
  expect(timeline.duration()).toBeCloseTo(1.5);

  timeline.kill();
});
