import { beforeEach, expect, test } from "bun:test";
import {
  toCssSeconds,
  toMilliseconds,
  toSeconds,
  wait,
} from "@pumzow/game-engine";

import { bangUp } from "../../app/effects/bangUp";
import {
  eventDefinitions,
  gameEvents,
} from "../../app/events/gameEvents";

beforeEach(() => gameEvents.clear());

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

test("bangUp counts from the starting value to the ending value", () => {
  const counter = { value: 0 };
  const countedValues: number[] = [];

  const timeline = bangUp({
    target: counter,
    to: 100,
    tween: {
      onUpdate: () => countedValues.push(counter.value),
      snap: { value: 1 },
    },
  });
  timeline.pause();
  expect(timeline.getChildren(false, true, false)).toHaveLength(1);
  expect(timeline.duration()).toBeCloseTo(1);

  timeline.seek(1, false);
  expect(counter.value).toBe(100);
  expect(countedValues.at(-1)).toBeCloseTo(100);

  timeline.kill();
});

test("bangUp emits start and end events around counting", () => {
  const startedSources: string[] = [];
  const endedSources: string[] = [];
  const unsubscribe = gameEvents.on(eventDefinitions.BangUpStart, ({ source }) => {
    startedSources.push(source);
  });
  const unsubscribeEnded = gameEvents.on(eventDefinitions.BangUpEnd, ({ source }) => {
    endedSources.push(source);
  });
  const timeline = bangUp({
    duration: 0.2,
    eventSource: "completion-points",
    target: { value: 0 },
    to: 10,
  });
  timeline.pause();

  expect(startedSources).toEqual(["completion-points"]);
  expect(endedSources).toEqual([]);

  timeline.seek(0.19, false);
  expect(endedSources).toEqual([]);

  timeline.seek(0.2, false);
  expect(endedSources).toEqual(["completion-points"]);

  unsubscribe();
  unsubscribeEnded();
  timeline.kill();
});
