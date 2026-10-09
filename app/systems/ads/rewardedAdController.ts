import type { AdsAdapter } from "./adsAdapter";
import {
  eventsManager,
  type EventsManager,
} from "../eventsManager";
import { EventTypes } from "../../types/eventTypes";

export type RewardedAdResult = "rewarded" | "dismissed" | "unavailable";

export class RewardedAdController {
  private preparePromise: Promise<void> | null = null;
  private ready = false;
  private showing = false;
  private destroyed = false;

  constructor(
    private readonly adapter: AdsAdapter,
    private readonly events: EventsManager = eventsManager,
  ) {}

  prepare(): Promise<void> {
    if (this.preparePromise || this.destroyed)
      return this.preparePromise ?? Promise.resolve();
    this.preparePromise = this.adapter
      .prepareRewarded()
      .then(() => { this.ready = true; })
      .catch(() => { this.ready = false; })
      .finally(() => { this.preparePromise = null; });
    return this.preparePromise;
  }

  async show(): Promise<RewardedAdResult> {
    if (!this.ready || this.showing || this.destroyed) {
      void this.prepare();
      return "unavailable";
    }
    this.ready = false;
    this.showing = true;
    this.events.emit(EventTypes.AdStarted, {});
    try {
      return await this.adapter.showRewarded() ? "rewarded" : "dismissed";
    } catch {
      return "unavailable";
    } finally {
      this.events.emit(EventTypes.AdFinished, {});
      this.showing = false;
      void this.prepare();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.ready = false;
  }
}
