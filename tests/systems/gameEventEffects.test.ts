import { describe, expect, test } from "bun:test";
import { EventsManager } from "../../app/systems/eventsManager";
import { GameEventEffects } from "../../app/systems/gameEventEffects";
import { EventTypes } from "../../app/types/eventTypes";

describe("GameEventEffects", () => {
  test("translates game events into sound and haptic effects", () => {
    const events = new EventsManager();
    const calls: string[] = [];
    const effects = new GameEventEffects({
      events,
      playSoundtrack: () => { calls.push("music"); },
      stopSoundtrack: () => { calls.push("stop-music"); },
      playConnectionFeedback: async (count) => { calls.push(`connect:${count}`); },
      playCompletionFeedback: async (perfect) => { calls.push(`complete:${perfect}`); },
    });

    events.emit(EventTypes.GameEntered, { source: "intro" });
    events.emit(EventTypes.TilesCombined, { connectedTileCount: 4 });
    events.emit(EventTypes.LevelCompleted, {
      levelId: 7,
      offline: false,
      stars: 3,
      perfect: true,
    });
    effects.destroy();

    expect(calls).toEqual(["music", "connect:4", "complete:true", "stop-music"]);
  });

  test("removes its listeners when destroyed", () => {
    const events = new EventsManager();
    let feedbackCount = 0;
    const effects = new GameEventEffects({
      events,
      playSoundtrack: () => undefined,
      stopSoundtrack: () => undefined,
      playConnectionFeedback: async () => { feedbackCount += 1; },
      playCompletionFeedback: async () => undefined,
    });

    effects.destroy();
    events.emit(EventTypes.TilesCombined, { connectedTileCount: 2 });

    expect(feedbackCount).toBe(0);
  });
});
