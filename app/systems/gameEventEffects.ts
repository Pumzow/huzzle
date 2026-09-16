import { EventTypes } from "../types/eventTypes";
import { deviceFeedback } from "./deviceFeedback";
import { eventsManager, type EventsManager } from "./eventsManager";

type GameEventEffectDependencies = {
  events: Pick<EventsManager, "on">;
  playConnectionFeedback: (connectedTileCount: number) => Promise<void>;
  playCompletionFeedback: (perfect: boolean) => Promise<void>;
};

function defaultDependencies(): GameEventEffectDependencies {
  return {
    events: eventsManager,
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
  }
}
