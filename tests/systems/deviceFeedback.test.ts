import { expect, test } from "bun:test";
import { ImpactStyle } from "@capacitor/haptics";
import { DeviceFeedback } from "../../app/systems/deviceFeedback";
import { gameConfig } from "../../app/config/gameConfig";

test("sends the configured impact on a native device", async () => {
  const impacts: ImpactStyle[] = [];
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    impact: async (style) => { impacts.push(style); },
  });

  await feedback.impact("light");

  expect(impacts).toEqual([ImpactStyle.Light]);
});

test("does not request haptics in the desktop browser", async () => {
  let impactCount = 0;
  const feedback = new DeviceFeedback({
    isNativePlatform: () => false,
    impact: async () => { impactCount += 1; },
  });

  await feedback.impact("heavy");

  expect(impactCount).toBe(0);
});

test("ignores unavailable device haptics", async () => {
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    impact: async () => { throw new Error("Haptics unavailable"); },
  });

  expect(feedback.impact("medium")).resolves.toBeUndefined();
});

test("uses a medium impact when a large tile group connects", async () => {
  const impacts: ImpactStyle[] = [];
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    impact: async (style) => { impacts.push(style); },
  });

  await feedback.connection(4);

  expect(impacts).toEqual([ImpactStyle.Medium]);
});

test("uses a double impact for a perfect completion", async () => {
  const impacts: ImpactStyle[] = [];
  const delays: number[] = [];
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    impact: async (style) => { impacts.push(style); },
    delay: async (milliseconds) => { delays.push(milliseconds); },
  });

  await feedback.completion(true);

  expect(impacts).toEqual([ImpactStyle.Heavy, ImpactStyle.Medium]);
  expect(delays).toEqual([gameConfig.deviceFeedback.perfectCompletionDelayMs]);
});

test("persists the disabled preference and suppresses feedback", async () => {
  const persisted: boolean[] = [];
  let impactCount = 0;
  const feedback = new DeviceFeedback({
    isNativePlatform: () => true,
    impact: async () => { impactCount += 1; },
    persistEnabled: (enabled) => { persisted.push(enabled); },
  });

  expect(feedback.toggleEnabled()).toBe(false);
  await feedback.completion(true);

  expect(persisted).toEqual([false]);
  expect(impactCount).toBe(0);
});
