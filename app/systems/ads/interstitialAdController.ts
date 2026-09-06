import type { AdsAdapter } from "./adsAdapter";

export type InterstitialResult = "shown" | "skipped" | "unavailable";

export class InterstitialAdController {
  private preparePromise: Promise<void> | null = null;
  private ready = false;
  private completedLevels = 0;
  private destroyed = false;

  constructor(
    private readonly adapter: AdsAdapter,
    private readonly everyCompletedLevels: number,
  ) {}

  prepare(): Promise<void> {
    if (this.preparePromise || this.destroyed)
      return this.preparePromise ?? Promise.resolve();

    this.preparePromise = this.adapter
      .prepareInterstitial()
      .then(() => {
        this.ready = true;
      })
      .catch(() => {
        this.ready = false;
      })
      .finally(() => {
        this.preparePromise = null;
      });
    return this.preparePromise;
  }

  async showAfterCompletedLevel(): Promise<InterstitialResult> {
    this.completedLevels += 1;
    if (this.completedLevels % this.everyCompletedLevels !== 0)
      return "skipped";

    if (!this.ready || this.destroyed) {
      void this.prepare();
      return "unavailable";
    }

    this.ready = false;
    try {
      await this.adapter.showInterstitial();
      return "shown";
    } catch {
      return "unavailable";
    } finally {
      void this.prepare();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.ready = false;
  }
}
