import { appConfig, resolveAssetPath } from "../config/appConfig";
import { EventTypes } from "../types/eventTypes";
import { deviceFeedback } from "./deviceFeedback";
import { eventsManager, type EventsManager } from "./eventsManager";
import { soundManager } from "./soundManager";

type GameEventEffectDependencies = {
  events: Pick<EventsManager, "on">;
  playSoundtrack: () => void;
  stopSoundtrack: () => void;
  playTilePickupSound: () => void;
  playTilePlacementSound: () => void;
  playTileCombinationSound: () => void;
  playCompletionStarSound: () => void;
  playCompletionPointsSound: () => void;
  stopCompletionPointsSound: () => void;
  playConnectionFeedback: (connectedTileCount: number) => Promise<void>;
  playCompletionFeedback: (perfect: boolean) => Promise<void>;
};

function defaultDependencies(): GameEventEffectDependencies {
  const soundtrack = resolveAssetPath(appConfig.soundtrack.file);
  const configuredEffects = [
    appConfig.sfx.tilePickup,
    appConfig.sfx.tilePlacement,
    appConfig.sfx.tileCombination,
    appConfig.sfx.completionStar,
    appConfig.sfx.completionPoints,
  ];
  configuredEffects.forEach((effect) => {
    effect.files.forEach((file) => soundManager.preloadSound(resolveAssetPath(file)));
  });
  const playConfiguredSound = (effect: {
    files: readonly string[];
    pitchRange: { min: number; max: number };
  }, group?: string) => {
    const file = effect.files[Math.floor(Math.random() * effect.files.length)];
    if (!file) return;
    soundManager.playSound({
      channel: "sfx",
      group,
      pitchRange: effect.pitchRange,
      source: resolveAssetPath(file),
    });
  };
  return {
    events: eventsManager,
    playSoundtrack: () => {
      if (appConfig.soundtrack.enabled) {
        soundManager.playSound({
          channel: "soundtrack",
          loop: appConfig.soundtrack.loop,
          source: soundtrack,
        });
      }
    },
    stopSoundtrack: () => soundManager.stopSound(soundtrack),
    playTilePickupSound: () => playConfiguredSound(appConfig.sfx.tilePickup),
    playTilePlacementSound: () => playConfiguredSound(appConfig.sfx.tilePlacement),
    playTileCombinationSound: () => playConfiguredSound(appConfig.sfx.tileCombination),
    playCompletionStarSound: () => playConfiguredSound(appConfig.sfx.completionStar),
    playCompletionPointsSound: () => playConfiguredSound(
      appConfig.sfx.completionPoints,
      "completion-points",
    ),
    stopCompletionPointsSound: () => soundManager.stopGroup("completion-points"),
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
      this.dependencies.events.on(EventTypes.TilePickedUp, () => {
        this.dependencies.playTilePickupSound();
      }),
      this.dependencies.events.on(EventTypes.TilePlaced, () => {
        this.dependencies.playTilePlacementSound();
      }),
      this.dependencies.events.on(EventTypes.TilesCombined, ({ connectedTileCount }) => {
        this.dependencies.playTileCombinationSound();
        void this.dependencies.playConnectionFeedback(connectedTileCount);
      }),
      this.dependencies.events.on(EventTypes.CompletionStarShown, () => {
        this.dependencies.playCompletionStarSound();
      }),
      this.dependencies.events.on(EventTypes.BangUpStart, ({ source }) => {
        if (source === "completion-points") {
          this.dependencies.playCompletionPointsSound();
        }
      }),
      this.dependencies.events.on(EventTypes.BangUpEnd, ({ source }) => {
        if (source === "completion-points") {
          this.dependencies.stopCompletionPointsSound();
        }
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
