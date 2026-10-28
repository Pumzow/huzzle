import { beforeEach, describe, expect, test } from "bun:test";
import type {
  AudioBackend,
  SoundPlayback,
} from "@soundtool/engine";
import { GameAudioController } from "../../app/systems/gameAudioController";
import {
  eventDefinitions,
  gameEvents,
} from "../../app/events/gameEvents";

class FakeAudioBackend implements AudioBackend {
  readonly played: SoundPlayback[] = [];
  readonly stoppedGroups: string[] = [];
  readonly volumeUpdates: Array<{ soundId: string; volume: number }> = [];
  stoppedAll = 0;

  async preload(): Promise<void> {}
  play(playback: SoundPlayback): void { this.played.push(playback); }
  stopAll(): void { this.stoppedAll += 1; }
  stopGroup(group: string): void { this.stoppedGroups.push(group); }
  setBusVolume(): void {}
  updateSoundVolume(
    soundId: string,
    volume: number,
  ): void {
    this.volumeUpdates.push({ soundId, volume });
  }
  destroy(): void { this.stopAll(); }
}

async function flushSoundGraph(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("GameAudioController", () => {
  beforeEach(() => gameEvents.clear());

  test("routes Huzzle events through the exported sound graph", async () => {
    const backend = new FakeAudioBackend();
    const audio = new GameAudioController({
      backend,
      resolveSource: (source) => `/assets/${source}`,
    });

    gameEvents.emit(eventDefinitions.GameEntered);
    gameEvents.emit(eventDefinitions.MainMenuEntered);
    gameEvents.emit(eventDefinitions.PuzzleEntered);
    gameEvents.emit(eventDefinitions.StartGame);
    gameEvents.emit(eventDefinitions.TilePlaced);
    gameEvents.emit(eventDefinitions.TilesCombined, { connectedTileCount: 2 });
    gameEvents.emit(eventDefinitions.TilesCombined, { connectedTileCount: 4 });
    gameEvents.emit(eventDefinitions.LevelCompleted, {
      levelId: 1,
      offline: false,
      stars: 3,
      perfect: true,
    });
    gameEvents.emit(eventDefinitions.CompletionStarShown, { starNumber: 1 });
    gameEvents.emit(eventDefinitions.BangUpStart, { source: "completion-points" });
    gameEvents.emit(eventDefinitions.BangUpEnd, { source: "completion-points" });
    gameEvents.emit(eventDefinitions.NextButton);
    await flushSoundGraph();

    expect(backend.played.map(({ soundId }) => soundId).sort()).toEqual([
      "endSparkle",
      "gameLoop",
      "huzzleWinEnd",
      "introLoop",
      "move",
      "moveWin1",
      "moveWin2",
      "nextButton",
      "pointCounterWin",
      "pointsCounter",
      "starPopUp",
      "startGame",
    ]);
    expect(backend.played.find(({ soundId }) => soundId === "introLoop"))
      .toMatchObject({ loop: true, volume: 1 });
    expect(backend.played.find(({ soundId }) => soundId === "gameLoop"))
      .toMatchObject({ loop: true, volume: 0 });
    expect(backend.volumeUpdates.map(({ soundId, volume }) =>
      `${soundId}:${volume}`).sort()).toEqual([
      "gameLoop:0",
      "gameLoop:1",
      "introLoop:0",
      "introLoop:1",
    ]);
    expect(backend.played.find(({ soundId }) => soundId === "pointsCounter"))
      .toMatchObject({
        group: "points-counter",
      });
    expect(backend.stoppedGroups).toEqual(["points-counter"]);
    expect(backend.played.find(({ soundId }) => soundId === "huzzleWinEnd"))
      .toMatchObject({
        source: "/assets/sounds/huzzelWinEnd.wav",
      });

    audio.destroy();
    expect(backend.stoppedAll).toBe(1);
  });

  test("does not play movement audio for unrelated events", async () => {
    const backend = new FakeAudioBackend();
    const audio = new GameAudioController({ backend });

    gameEvents.emit(eventDefinitions.TilePickedUp);
    gameEvents.emit(eventDefinitions.AdStarted);
    await flushSoundGraph();

    expect(backend.played).toEqual([]);

    audio.destroy();
  });

  test("disconnects from game events when destroyed", async () => {
    const backend = new FakeAudioBackend();
    const audio = new GameAudioController({ backend });

    audio.destroy();
    gameEvents.emit(eventDefinitions.TilePlaced);
    await flushSoundGraph();

    expect(backend.played).toHaveLength(0);
  });
});
