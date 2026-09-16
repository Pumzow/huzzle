import { describe, expect, test } from "bun:test";
import type { AudioBackend, SoundPlayback } from "@soundtool/engine";
import { EventsManager } from "../../app/systems/eventsManager";
import { GameAudioController } from "../../app/systems/gameAudioController";
import { EventTypes } from "../../app/types/eventTypes";

class FakeAudioBackend implements AudioBackend {
  readonly played: SoundPlayback[] = [];
  readonly stoppedGroups: string[] = [];
  stoppedAll = 0;

  async preload(): Promise<void> {}
  play(playback: SoundPlayback): void { this.played.push(playback); }
  stopAll(): void { this.stoppedAll += 1; }
  stopGroup(group: string): void { this.stoppedGroups.push(group); }
  setBusVolume(): void {}
  destroy(): void { this.stopAll(); }
}

describe("GameAudioController", () => {
  test("routes Huzzle events through the exported sound graph", () => {
    const events = new EventsManager();
    const backend = new FakeAudioBackend();
    const audio = new GameAudioController({
      events,
      backend,
      resolveSource: (source) => `/assets/${source}`,
    });

    events.emit(EventTypes.TilePickedUp, {});
    events.emit(EventTypes.BangUpStart, { source: "completion-points" });
    events.emit(EventTypes.BangUpEnd, { source: "completion-points" });

    expect(backend.played[0]?.source).toMatch(/^\/assets\/sounds\/effects\/tile-pickup-[12]\.wav$/);
    expect(backend.played[1]).toMatchObject({
      source: "/assets/sounds/effects/points-bang-up.mp3",
      group: "completion-points",
    });
    expect(backend.stoppedGroups).toEqual(["completion-points"]);

    audio.destroy();
    expect(backend.stoppedAll).toBe(1);
  });

  test("disconnects from game events when destroyed", () => {
    const events = new EventsManager();
    const backend = new FakeAudioBackend();
    const audio = new GameAudioController({ events, backend });

    audio.destroy();
    events.emit(EventTypes.TilePlaced, {});

    expect(backend.played).toHaveLength(0);
  });
});
