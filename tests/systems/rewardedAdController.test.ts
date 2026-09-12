import { describe, expect, test } from "bun:test";
import type { AdsAdapter } from "../../app/systems/ads/adsAdapter";
import { RewardedAdController } from "../../app/systems/ads/rewardedAdController";

function adapter(showRewarded: () => Promise<boolean>): AdsAdapter {
  return {
    initialize: async () => true,
    prepareBanner: async () => undefined,
    hideBanner: async () => undefined,
    resumeBanner: async () => undefined,
    prepareInterstitial: async () => undefined,
    showInterstitial: async () => undefined,
    prepareRewarded: async () => undefined,
    showRewarded,
    destroy: async () => undefined,
  };
}

describe("RewardedAdController", () => {
  test("distinguishes earned rewards from early dismissal", async () => {
    const rewarded = new RewardedAdController(adapter(async () => true));
    await rewarded.prepare();
    expect(await rewarded.show()).toBe("rewarded");

    const dismissed = new RewardedAdController(adapter(async () => false));
    await dismissed.prepare();
    expect(await dismissed.show()).toBe("dismissed");
  });

  test("reports unavailable while an ad is not prepared", async () => {
    const rewarded = new RewardedAdController(adapter(async () => true));
    expect(await rewarded.show()).toBe("unavailable");
  });
});
