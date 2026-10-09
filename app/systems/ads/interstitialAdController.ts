import type { AdsAdapter } from "./adsAdapter";
import {
  eventsManager,
  type EventsManager,
} from "../eventsManager";
import { EventTypes } from "../../types/eventTypes";

export type InterstitialResult = "shown" | "skipped" | "unavailable";

export class InterstitialAdController {
  private preparePromise: Promise<void> | null = null;
  private ready = false;
  private completedLevels = 0;
  private destroyed = false;

  constructor(
    private readonly adapter: AdsAdapter,
    private readonly everyCompletedLevels: number,
    private readonly events: EventsManager = eventsManager,
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
    this.events.emit(EventTypes.AdStarted, {});
    try {
      await this.adapter.showInterstitial();
      return "shown";
    } catch {
      return "unavailable";
    } finally {
      this.events.emit(EventTypes.AdFinished, {});
      void this.prepare();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.ready = false;
  }
}
