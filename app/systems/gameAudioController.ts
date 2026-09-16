import {
  SoundEngine,
  bindSoundEvents,
  type AudioBackend,
  type SoundGraph,
} from "@soundtool/engine";
import soundGraphJson from "../config/soundGraph.json";
import { resolveAssetPath } from "../config/appConfig";
import { EventTypes, type EventPayloads } from "../types/eventTypes";
import { eventsManager, type EventsManager } from "./eventsManager";
import { HuzzleAudioBackend } from "./huzzleAudioBackend";

const soundEvents = [
  EventTypes.GameEntered,
  EventTypes.TilePickedUp,
  EventTypes.TilePlaced,
  EventTypes.TilesCombined,
  EventTypes.CompletionStarShown,
  EventTypes.BangUpStart,
  EventTypes.BangUpEnd,
] as const;

type SoundEventType = (typeof soundEvents)[number];

type GameAudioControllerOptions = {
  backend?: AudioBackend;
  events?: Pick<EventsManager, "on">;
  graph?: SoundGraph;
  resolveSource?: (source: string) => string;
};

export const huzzleSoundGraph = soundGraphJson as SoundGraph;

export class GameAudioController {
  private readonly engine: SoundEngine;
  private readonly disconnect: () => void;
  private destroyed = false;

  constructor(options: GameAudioControllerOptions = {}) {
    const events = options.events ?? eventsManager;
    this.engine = new SoundEngine(options.graph ?? huzzleSoundGraph, {
      backend: options.backend ?? new HuzzleAudioBackend(),
      resolveSource: options.resolveSource ?? resolveAssetPath,
    });
    this.disconnect = bindSoundEvents<EventPayloads, SoundEventType>(
      this.engine,
      soundEvents,
      (event, listener) => events.on(event, (payload) => listener(payload as never)),
    );
    void this.engine.preload().catch((error: unknown) => {
      console.warn("Could not preload one or more game sounds.", error);
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.disconnect();
    this.engine.destroy();
  }
}
