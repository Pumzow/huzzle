import type { PluginListenerHandle } from "@capacitor/core";
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from "@capacitor-community/admob";
import type { AdsAdapter, BannerSize } from "./adsAdapter";

type CapacitorAdsConfig = {
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
  testing: boolean;
};

export class CapacitorAdsAdapter implements AdsAdapter {
  private readonly listeners: PluginListenerHandle[] = [];

  constructor(private readonly config: CapacitorAdsConfig) {}

  async initialize(): Promise<boolean> {
    await AdMob.initialize({ initializeForTesting: this.config.testing });
    if (this.config.testing) return true;

    let consent = await AdMob.requestConsentInfo();
    if (
      consent.status === AdmobConsentStatus.REQUIRED &&
      consent.isConsentFormAvailable
    ) {
      consent = await AdMob.showConsentForm();
    }
    return consent.canRequestAds;
  }

  async prepareBanner(onSizeChanged: (size: BannerSize) => void): Promise<void> {
    this.listeners.push(
      await AdMob.addListener(BannerAdPluginEvents.SizeChanged, onSizeChanged)
    );
    const temporaryListeners: PluginListenerHandle[] = [];
    let resolveLoaded: () => void = () => undefined;
    let rejectLoaded: (error: unknown) => void = () => undefined;
    const loaded = new Promise<void>((resolve, reject) => {
      resolveLoaded = resolve;
      rejectLoaded = reject;
    });
    temporaryListeners.push(
      await AdMob.addListener(BannerAdPluginEvents.Loaded, resolveLoaded),
      await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, rejectLoaded)
    );

    try {
      await AdMob.showBanner({
        adId: this.config.bannerId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        isTesting: this.config.testing,
        position: BannerAdPosition.BOTTOM_CENTER,
      });
      // The native view exists now, so hide it while its ad request completes.
      await AdMob.hideBanner();
      await loaded;
    } finally {
      await Promise.allSettled(
        temporaryListeners.map((listener) => listener.remove())
      );
    }
  }

  async hideBanner(): Promise<void> {
    await AdMob.hideBanner();
  }

  async resumeBanner(): Promise<void> {
    await AdMob.resumeBanner();
  }

  async prepareInterstitial(): Promise<void> {
    await AdMob.prepareInterstitial({
      adId: this.config.interstitialId,
      immersiveMode: true,
      isTesting: this.config.testing,
    });
  }

  async showInterstitial(): Promise<void> {
    const temporaryListeners: PluginListenerHandle[] = [];
    let settled = false;
    let resolveDismissal: () => void = () => undefined;
    let rejectDismissal: (error: unknown) => void = () => undefined;

    const cleanup = async () => {
      await Promise.all(temporaryListeners.map((listener) => listener.remove()));
    };
    const dismissed = new Promise<void>((resolve, reject) => {
      resolveDismissal = resolve;
      rejectDismissal = reject;
    });
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      void cleanup().finally(() =>
        error ? rejectDismissal(error) : resolveDismissal()
      );
    };
    temporaryListeners.push(
      await AdMob.addListener(
        InterstitialAdPluginEvents.Dismissed,
        () => finish()
      ),
      await AdMob.addListener(
        InterstitialAdPluginEvents.FailedToShow,
        (error) => finish(error)
      )
    );

    try {
      await AdMob.showInterstitial();
    } catch (error) {
      settled = true;
      await cleanup();
      throw error;
    }
    await dismissed;
  }

  async prepareRewarded(): Promise<void> {
    await AdMob.prepareRewardVideoAd({
      adId: this.config.rewardedId,
      isTesting: this.config.testing,
    });
  }

  async showRewarded(): Promise<boolean> {
    const temporaryListeners: PluginListenerHandle[] = [];
    let settled = false;
    let earned = false;
    let resolveResult: (earnedReward: boolean) => void = () => undefined;
    let rejectResult: (error: unknown) => void = () => undefined;
    const result = new Promise<boolean>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    const cleanup = async () => {
      await Promise.all(temporaryListeners.map((listener) => listener.remove()));
    };
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      void cleanup().finally(() =>
        error ? rejectResult(error) : resolveResult(earned)
      );
    };
    temporaryListeners.push(
      await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        earned = true;
      }),
      await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish()),
      await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (error) =>
        finish(error)
      ),
    );
    try {
      void AdMob.showRewardVideoAd().then(() => { earned = true; }).catch(finish);
    } catch (error) {
      finish(error);
    }
    return result;
  }

  async destroy(): Promise<void> {
    document.documentElement.style.setProperty("--ad-banner-height", "0px");
    await Promise.allSettled([
      AdMob.removeBanner(),
      ...this.listeners.map((listener) => listener.remove()),
    ]);
    this.listeners.length = 0;
  }
}
