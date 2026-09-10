import { expect, test } from "bun:test";

import type { AdsAdapter } from "../../app/systems/ads/adsAdapter";
import { AdsManager } from "../../app/systems/ads/adsManager";

class FakeAdsAdapter implements AdsAdapter {
  calls: string[] = [];

  async initialize(): Promise<boolean> {
    this.calls.push("initialize");
    return true;
  }

  async prepareBanner(): Promise<void> {
    this.calls.push("prepareBanner");
  }

  async hideBanner(): Promise<void> {
    this.calls.push("hideBanner");
  }

  async resumeBanner(): Promise<void> {
    this.calls.push("resumeBanner");
  }

  async prepareInterstitial(): Promise<void> {
    this.calls.push("prepareInterstitial");
  }

  async showInterstitial(): Promise<void> {
    this.calls.push("showInterstitial");
  }

  async destroy(): Promise<void> {
    this.calls.push("destroy");
  }
}

test("preloads the banner and interstitial during the intro", async () => {
  const adapter = new FakeAdsAdapter();
  const manager = new AdsManager(async () => adapter);

  await manager.initialize();

  expect(adapter.calls).toEqual([
    "initialize",
    "prepareBanner",
    "prepareInterstitial",
  ]);
});

test("resumes the preloaded banner after the intro and reuses it", async () => {
  const adapter = new FakeAdsAdapter();
  const manager = new AdsManager(async () => adapter);

  await manager.setBannerVisible(false);
  expect(adapter.calls).toEqual([
    "initialize",
    "prepareBanner",
    "prepareInterstitial",
    "hideBanner",
  ]);

  await manager.setBannerVisible(true);
  await manager.setBannerVisible(false);
  await manager.setBannerVisible(true);

  expect(adapter.calls).toEqual([
    "initialize",
    "prepareBanner",
    "prepareInterstitial",
    "hideBanner",
    "resumeBanner",
    "hideBanner",
    "resumeBanner",
  ]);
});

test("shows a prepared interstitial when advancing after every second completed level", async () => {
  const adapter = new FakeAdsAdapter();
  const manager = new AdsManager(async () => adapter);
  await manager.initialize();

  expect(await manager.showInterstitialAfterLevel()).toBe("skipped");
  expect(adapter.calls).not.toContain("showInterstitial");
  expect(await manager.showInterstitialAfterLevel()).toBe("shown");
  expect(adapter.calls.filter((call) => call === "showInterstitial")).toHaveLength(1);

  await Promise.resolve();
  expect(await manager.showInterstitialAfterLevel()).toBe("skipped");
  expect(await manager.showInterstitialAfterLevel()).toBe("shown");
  expect(adapter.calls.filter((call) => call === "showInterstitial")).toHaveLength(2);
});

test("continues without ads when no native adapter is available", async () => {
  const manager = new AdsManager(async () => null);

  expect(await manager.showInterstitialAfterLevel()).toBe("unavailable");
});
