import { expect, test } from "bun:test";
import { DeviceFeedback } from "../../app/systems/deviceFeedback";
import { gameConfig } from "../../app/config/gameConfig";

test("sends the configured impact on a native device", async () => {
  const durations: number[] = [];
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    vibrate: async (duration) => { durations.push(duration); },
  });

  await feedback.impact("light");

  expect(durations).toEqual([gameConfig.deviceFeedback.vibrationDurationMs.light]);
});

test("does not request haptics in the desktop browser", async () => {
  let impactCount = 0;
  const feedback = new DeviceFeedback({
    isNativePlatform: () => false,
    vibrate: async () => { impactCount += 1; },
  });

  await feedback.impact("heavy");

  expect(impactCount).toBe(0);
});

test("ignores unavailable device haptics", async () => {
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    vibrate: async () => { throw new Error("Haptics unavailable"); },
    warn: () => undefined,
  });

  expect(feedback.impact("medium")).resolves.toBeUndefined();
});

test("uses a medium impact when a large tile group connects", async () => {
  const durations: number[] = [];
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    vibrate: async (duration) => { durations.push(duration); },
  });

  await feedback.connection(4);

  expect(durations).toEqual([gameConfig.deviceFeedback.vibrationDurationMs.medium]);
});

test("uses a double impact for a perfect completion", async () => {
  const durations: number[] = [];
  const delays: number[] = [];
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    vibrate: async (duration) => { durations.push(duration); },
    delay: async (milliseconds) => { delays.push(milliseconds); },
  });

  await feedback.completion(true);

  expect(durations).toEqual([
    gameConfig.deviceFeedback.vibrationDurationMs.heavy,
    gameConfig.deviceFeedback.vibrationDurationMs.medium,
  ]);
  expect(delays).toEqual([gameConfig.deviceFeedback.perfectCompletionDelayMs]);
});

test("persists the disabled preference and suppresses feedback", async () => {
  const persisted: boolean[] = [];
  let impactCount = 0;
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    vibrate: async () => { impactCount += 1; },
    persistEnabled: (enabled) => { persisted.push(enabled); },
  });

  expect(feedback.toggleEnabled()).toBe(false);
  await feedback.completion(true);

  expect(persisted).toEqual([false]);
  expect(impactCount).toBe(0);
});
