import { describe, expect, test } from "bun:test";
import { EventsManager, type EventListener } from "@pumzow/game-engine";
import { eventDefinitions } from "../../app/events/gameEvents";

describe("EventsManager", () => {
  test("emits payloads to listeners and supports explicit removal", () => {
    const events = new EventsManager();
    const received: number[] = [];
    const listener: EventListener = ({ connectedTileCount }) =>
      received.push(connectedTileCount);
    events.on(eventDefinitions.TilesCombined, listener);

    events.emit(eventDefinitions.TilesCombined, { connectedTileCount: 3 });
    events.off(eventDefinitions.TilesCombined, listener);
    events.emit(eventDefinitions.TilesCombined, { connectedTileCount: 5 });

    expect(received).toEqual([3]);
  });

  test("runs once listeners only for their first event", () => {
    const events = new EventsManager();
    let completions = 0;
    events.once(eventDefinitions.LevelCompleted, () => { completions += 1; });

    const completion = {
      levelId: 2,
      offline: false,
      stars: 3,
      perfect: true,
    };
    events.emit(eventDefinitions.LevelCompleted, completion);
    events.emit(eventDefinitions.LevelCompleted, completion);

    expect(completions).toBe(1);
  });

  test("clears one event type without affecting the others", () => {
    const events = new EventsManager();
    let entered = 0;
    let combined = 0;
    events.on(eventDefinitions.GameEntered, () => { entered += 1; });
    events.on(eventDefinitions.TilesCombined, () => { combined += 1; });

    events.clear(eventDefinitions.GameEntered);
    events.emit(eventDefinitions.GameEntered, { source: "intro" });
    events.emit(eventDefinitions.TilesCombined, { connectedTileCount: 2 });

    expect(entered).toBe(0);
    expect(combined).toBe(1);
  });
});
