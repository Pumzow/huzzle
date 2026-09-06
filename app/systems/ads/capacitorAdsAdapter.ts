import type { PluginListenerHandle } from "@capacitor/core";
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
} from "@capacitor-community/admob";
import type { AdsAdapter, BannerSize } from "./adsAdapter";

type CapacitorAdsConfig = {
  bannerId: string;
  interstitialId: string;
  testing: boolean;
};

export class CapacitorAdsAdapter implements AdsAdapter {
  private readonly listeners: PluginListenerHandle[] = [];

  constructor(private readonly config: CapacitorAdsConfig) {}

  async initialize(): Promise<boolean> {
    await AdMob.initialize({ initializeForTesting: this.config.testing });
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

  async destroy(): Promise<void> {
    document.documentElement.style.setProperty("--ad-banner-height", "0px");
    await Promise.allSettled([
      AdMob.removeBanner(),
      ...this.listeners.map((listener) => listener.remove()),
    ]);
    this.listeners.length = 0;
  }
}
