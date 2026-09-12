export type BannerSize = {
  height: number;
};

export interface AdsAdapter {
  initialize(): Promise<boolean>;
  prepareBanner(onSizeChanged: (size: BannerSize) => void): Promise<void>;
  hideBanner(): Promise<void>;
  resumeBanner(): Promise<void>;
  prepareInterstitial(): Promise<void>;
  showInterstitial(): Promise<void>;
  prepareRewarded(): Promise<void>;
  showRewarded(): Promise<boolean>;
  destroy(): Promise<void>;
}
