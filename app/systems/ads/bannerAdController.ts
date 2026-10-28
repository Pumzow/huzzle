import type { AdsAdapter } from "./adsAdapter";

export class BannerAdController {
  private preparePromise: Promise<void> | null = null;
  private loaded = false;
  private height = 0;
  private visible = false;
  private destroyed = false;

  constructor(private readonly adapter: AdsAdapter) {}

  prepare(): Promise<void> {
    if (this.preparePromise || this.loaded || this.destroyed)
      return this.preparePromise ?? Promise.resolve();

    this.preparePromise = this.adapter
      .prepareBanner(({ height }) => {
        if (height > 0) this.height = height;
        if (this.visible) this.setLayoutHeight(height);
      })
      .then(() => {
        this.loaded = true;
      })
      .catch((error) => {
        console.error("[AdsManager] Unable to prepare banner ad.", error);
        this.loaded = false;
        this.setLayoutHeight(0);
      })
      .finally(() => {
        this.preparePromise = null;
      });
    return this.preparePromise;
  }

  async setVisible(visible: boolean): Promise<void> {
    this.visible = visible;
    if (this.destroyed) return;

    try {
      if (!visible) {
        this.setLayoutHeight(0);
        if (this.loaded) await this.adapter.hideBanner();
        return;
      }

      if (!this.loaded) await this.prepare();
      if (!this.loaded || !this.visible || this.destroyed) return;
      await this.adapter.resumeBanner();
      this.setLayoutHeight(this.height);
    } catch (error) {
      console.error("[AdsManager] Unable to change banner visibility.", error);
      this.setLayoutHeight(0);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.loaded = false;
    this.height = 0;
    this.visible = false;
    this.setLayoutHeight(0);
  }

  private setLayoutHeight(height: number): void {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      "--ad-banner-height",
      `${Math.max(0, height)}px`,
    );
  }
}
