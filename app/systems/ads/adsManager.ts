import { Capacitor } from "@capacitor/core";
import { appConfig } from "../../config/appConfig";
import type { AdsAdapter } from "./adsAdapter";
import {
  isNativeDevice,
  type DeviceProfile,
  setDebugDeviceProfile,
} from "../../utils/deviceCapabilities";
import { BannerAdController } from "./bannerAdController";
import {
  InterstitialAdController,
  type InterstitialResult,
} from "./interstitialAdController";
import {
  RewardedAdController,
  type RewardedAdResult,
} from "./rewardedAdController";

export type HintAccessResult = RewardedAdResult | "free";

type AdsAdapterFactory = () => Promise<AdsAdapter | null>;

async function createNativeAdapter(): Promise<AdsAdapter | null> {
  if (Capacitor.getPlatform() !== "android") return null;
  const { CapacitorAdsAdapter } = await import("./capacitorAdsAdapter");
  return new CapacitorAdsAdapter(appConfig.ads.android);
}

export class AdsManager {
  private adapter: AdsAdapter | null = null;
  private banner: BannerAdController | null = null;
  private interstitial: InterstitialAdController | null = null;
  private rewarded: RewardedAdController | null = null;
  private initializePromise: Promise<void> | null = null;
  private destroyed = false;
  private debugDeviceProfile: DeviceProfile = "actual";

  constructor(private readonly adapterFactory: AdsAdapterFactory = createNativeAdapter) {}

  initialize(): Promise<void> {
    if (!this.initializePromise) this.initializePromise = this.initializeAds();
    return this.initializePromise;
  }

  async setBannerVisible(visible: boolean): Promise<void> {
    await this.initialize();
    if (!this.banner || this.destroyed) return;
    await this.banner.setVisible(visible);
  }

  async showInterstitialAfterLevel(): Promise<InterstitialResult> {
    await this.initialize();
    if (!this.interstitial || this.destroyed) return "unavailable";
    return this.interstitial.showAfterCompletedLevel();
  }

  get hintAccessMode(): "ad" | "free" {
    return (isNativeDevice() || Capacitor.getPlatform() === "android") && appConfig.ads.enabled
      ? "ad"
      : "free";
  }

  setDebugDeviceProfile(profile: DeviceProfile): void {
    this.debugDeviceProfile = profile;
    setDebugDeviceProfile(profile);
  }

  async requestHintAccess(): Promise<HintAccessResult> {
    if (this.debugDeviceProfile === "android") {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      return "rewarded";
    }
    await this.initialize();
    if (!this.rewarded || this.destroyed) return "free";
    const result = await this.rewarded.show();
    return result === "unavailable" ? "free" : result;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.banner?.destroy();
    this.interstitial?.destroy();
    this.rewarded?.destroy();
    this.banner = null;
    this.interstitial = null;
    this.rewarded = null;

    const adapter = this.adapter;
    this.adapter = null;
    if (adapter) await adapter.destroy();
  }

  private async initializeAds(): Promise<void> {
    if (!appConfig.ads.enabled || this.destroyed) return;
    try {
      const adapter = await this.adapterFactory();
      if (!adapter || this.destroyed) return;
      const canRequestAds = await adapter.initialize();
      if (!canRequestAds || this.destroyed) return;

      this.adapter = adapter;
      this.banner = new BannerAdController(adapter);
      this.interstitial = new InterstitialAdController(
        adapter,
        appConfig.ads.interstitial.everyCompletedLevels,
      );
      this.rewarded = new RewardedAdController(adapter);
      await Promise.all([
        this.banner.prepare(),
        this.interstitial.prepare(),
        this.rewarded.prepare(),
      ]);
    } catch (error) {
      console.error("[AdsManager] Unable to initialize ads.", error);
      this.adapter = null;
      this.banner = null;
      this.interstitial = null;
      this.rewarded = null;
    }
  }
}

export type { InterstitialResult } from "./interstitialAdController";
export const adsManager = new AdsManager();
