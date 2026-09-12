import { describe, expect, test } from "bun:test";
import { EventsManager } from "../../app/systems/eventsManager";
import { EventTypes } from "../../app/types/eventTypes";

describe("EventsManager", () => {
  test("emits typed payloads to listeners and supports unsubscribe", () => {
    const events = new EventsManager();
    const received: number[] = [];
    const unsubscribe = events.on(
      EventTypes.TilesCombined,
      ({ connectedTileCount }) => received.push(connectedTileCount),
    );

    events.emit(EventTypes.TilesCombined, { connectedTileCount: 3 });
    unsubscribe();
    events.emit(EventTypes.TilesCombined, { connectedTileCount: 5 });

    expect(received).toEqual([3]);
  });

  test("runs once listeners only for their first event", () => {
    const events = new EventsManager();
    let completions = 0;
    events.once(EventTypes.LevelCompleted, () => { completions += 1; });

    const completion = {
      levelId: 2,
      offline: false,
      stars: 3,
      perfect: true,
    };
    events.emit(EventTypes.LevelCompleted, completion);
    events.emit(EventTypes.LevelCompleted, completion);

    expect(completions).toBe(1);
  });

  test("clears one event type without affecting the others", () => {
    const events = new EventsManager();
    let entered = 0;
    let combined = 0;
    events.on(EventTypes.GameEntered, () => { entered += 1; });
    events.on(EventTypes.TilesCombined, () => { combined += 1; });

    events.clear(EventTypes.GameEntered);
    events.emit(EventTypes.GameEntered, { source: "intro" });
    events.emit(EventTypes.TilesCombined, { connectedTileCount: 2 });

    expect(entered).toBe(0);
    expect(combined).toBe(1);
  });
});
