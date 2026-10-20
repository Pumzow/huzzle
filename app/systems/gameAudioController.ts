import {
  SoundEngine,
  type AudioBackend,
  type SoundGraph,
} from "@soundtool/engine";
import type {
  EventDefinition,
  EventListener,
} from "@pumzow/game-engine";
import soundGraphJson from "../config/soundGraph.json";
import { resolveAssetPath } from "../config/appConfig";
import { eventDefinitions, gameEvents } from "../events/gameEvents";

type GameAudioControllerOptions = {
  backend: AudioBackend;
  graph?: SoundGraph;
  resolveSource?: (source: string) => string;
};

export const huzzleSoundGraph = soundGraphJson as SoundGraph;

export class GameAudioController {
  private readonly engine: SoundEngine;
  private readonly eventListeners = new Map<EventDefinition, EventListener>();
  private destroyed = false;

  constructor(options: GameAudioControllerOptions) {
    this.engine = new SoundEngine(options.graph ?? huzzleSoundGraph, {
      backend: options.backend,
      resolveSource: options.resolveSource ?? resolveAssetPath,
    });
    Object.values(eventDefinitions).forEach((event) => {
      const listener: EventListener = (payload) => {
        void this.engine.emit(event.name, payload);
      };
      this.eventListeners.set(event, listener);
      gameEvents.on(event, listener);
    });
    void this.engine.preload().catch((error: unknown) => {
      console.warn("Could not preload one or more game sounds.", error);
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.eventListeners.forEach((listener, event) => {
      gameEvents.off(event, listener);
    });
    this.eventListeners.clear();
    this.engine.destroy();
  }
}
