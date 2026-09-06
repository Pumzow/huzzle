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
  destroy(): Promise<void>;
}
