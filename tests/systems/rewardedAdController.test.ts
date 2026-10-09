import { describe, expect, test } from "bun:test";
import type { AdsAdapter } from "../../app/systems/ads/adsAdapter";
import { RewardedAdController } from "../../app/systems/ads/rewardedAdController";
import { EventsManager } from "../../app/systems/eventsManager";
import { EventTypes } from "../../app/types/eventTypes";

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

  test("reports only the time when an ad is actually presented", async () => {
    const events = new EventsManager();
    const presentationEvents: EventTypes[] = [];
    events.on(EventTypes.AdStarted, () => {
      presentationEvents.push(EventTypes.AdStarted);
    });
    events.on(EventTypes.AdFinished, () => {
      presentationEvents.push(EventTypes.AdFinished);
    });
    const rewarded = new RewardedAdController(
      adapter(async () => true),
      events,
    );

    await rewarded.prepare();
    await rewarded.show();

    expect(presentationEvents).toEqual([
      EventTypes.AdStarted,
      EventTypes.AdFinished,
    ]);
  });

  test("reports that presentation ended when the adapter fails", async () => {
    const events = new EventsManager();
    const presentationEvents: EventTypes[] = [];
    events.on(EventTypes.AdStarted, () => {
      presentationEvents.push(EventTypes.AdStarted);
    });
    events.on(EventTypes.AdFinished, () => {
      presentationEvents.push(EventTypes.AdFinished);
    });
    const rewarded = new RewardedAdController(
      adapter(async () => { throw new Error("ad failed"); }),
      events,
    );

    await rewarded.prepare();
    expect(await rewarded.show()).toBe("unavailable");
    expect(presentationEvents).toEqual([
      EventTypes.AdStarted,
      EventTypes.AdFinished,
    ]);
  });
});
