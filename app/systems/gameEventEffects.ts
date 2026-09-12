import { appConfig, resolveAssetPath } from "../config/appConfig";
import { EventTypes } from "../types/eventTypes";
import { deviceFeedback } from "./deviceFeedback";
import { eventsManager, type EventsManager } from "./eventsManager";
import { soundManager } from "./soundManager";

type GameEventEffectDependencies = {
  events: Pick<EventsManager, "on">;
  playSoundtrack: () => void;
  stopSoundtrack: () => void;
  playConnectionFeedback: (connectedTileCount: number) => Promise<void>;
  playCompletionFeedback: (perfect: boolean) => Promise<void>;
};

function defaultDependencies(): GameEventEffectDependencies {
  const soundtrack = resolveAssetPath(appConfig.soundtrack.file);
  return {
    events: eventsManager,
    playSoundtrack: () => {
      if (appConfig.soundtrack.enabled) {
        soundManager.playSound(
          soundtrack,
          appConfig.soundtrack.loop,
          "music",
        );
      }
    },
    stopSoundtrack: () => soundManager.stopSound(soundtrack),
    playConnectionFeedback: (connectedTileCount) =>
      deviceFeedback.connection(connectedTileCount),
    playCompletionFeedback: (perfect) => deviceFeedback.completion(perfect),
  };
}

export class GameEventEffects {
  private readonly dependencies: GameEventEffectDependencies;
  private readonly unsubscribers: Array<() => void>;
  private destroyed = false;

  constructor(dependencies: Partial<GameEventEffectDependencies> = {}) {
    this.dependencies = { ...defaultDependencies(), ...dependencies };
    this.unsubscribers = [
      this.dependencies.events.on(EventTypes.GameEntered, () => {
        this.dependencies.playSoundtrack();
      }),
      this.dependencies.events.on(EventTypes.TilesCombined, ({ connectedTileCount }) => {
        void this.dependencies.playConnectionFeedback(connectedTileCount);
      }),
      this.dependencies.events.on(EventTypes.LevelCompleted, ({ perfect }) => {
        void this.dependencies.playCompletionFeedback(perfect);
      }),
    ];
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.dependencies.stopSoundtrack();
  }
}
