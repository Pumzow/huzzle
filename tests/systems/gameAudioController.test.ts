import { beforeEach, describe, expect, test } from "bun:test";
import type { AudioBackend, SoundPlayback } from "@soundtool/engine";
import { GameAudioController } from "../../app/systems/gameAudioController";
import {
  eventDefinitions,
  gameEvents,
} from "../../app/events/gameEvents";

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
  beforeEach(() => gameEvents.clear());

  test("routes Huzzle events through the exported sound graph", () => {
    const backend = new FakeAudioBackend();
    const audio = new GameAudioController({
      backend,
      resolveSource: (source) => `/assets/${source}`,
    });

    gameEvents.emit(eventDefinitions.TilePickedUp);
    gameEvents.emit(eventDefinitions.BangUpStart, { source: "completion-points" });
    gameEvents.emit(eventDefinitions.BangUpEnd, { source: "completion-points" });
    gameEvents.emit(eventDefinitions.AdStarted);

    expect(backend.played[0]?.source).toMatch(/^\/assets\/sounds\/effects\/tile-pickup-[12]\.wav$/);
    expect(backend.played[1]).toMatchObject({
      source: "/assets/sounds/effects/points-bang-up.mp3",
      group: "completion-points",
    });
    expect(backend.stoppedGroups).toEqual(["completion-points"]);
    expect(backend.played).toHaveLength(2);

    audio.destroy();
    expect(backend.stoppedAll).toBe(1);
  });

  test("disconnects from game events when destroyed", () => {
    const backend = new FakeAudioBackend();
    const audio = new GameAudioController({ backend });

    audio.destroy();
    gameEvents.emit(eventDefinitions.TilePlaced);

    expect(backend.played).toHaveLength(0);
  });
});
