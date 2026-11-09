import { afterEach, expect, test } from "bun:test";
import type { SoundGraph } from "@soundtool/engine";
import { HuzzleAudioBackend } from "../../app/systems/huzzleAudioBackend";

class FakeAudio {
  preload = "";
  constructor(readonly src: string) {}
  load(): void {}
}

class FakeAudioParam {
  value = 1;
  setValueAtTime(value: number): void { this.value = value; }
  cancelAndHoldAtTime(): void {}
  linearRampToValueAtTime(value: number): void { this.value = value; }
  setValueCurveAtTime(values: Float32Array): void { this.value = values.at(-1) ?? this.value; }
}

class FakeGainNode {
  readonly gain = new FakeAudioParam();
  connect(): FakeGainNode { return this; }
}

class FakeSourceNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  readonly playbackRate = new FakeAudioParam();
  connect(): FakeGainNode { return new FakeGainNode(); }
  addEventListener(): void {}
  start(): void {}
  stop(): void {}
}

class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = "running";
  readonly destination = new FakeGainNode();
  createBufferSource(): AudioBufferSourceNode {
    return new FakeSourceNode() as unknown as AudioBufferSourceNode;
  }
  createGain(): GainNode { return new FakeGainNode() as unknown as GainNode; }
  async decodeAudioData(): Promise<AudioBuffer> {
    return { duration: 12 } as AudioBuffer;
  }
  async resume(): Promise<void> { this.state = "running"; }
  async close(): Promise<void> { this.state = "closed"; }
}

const originalAudio = globalThis.Audio;
const originalAudioContext = globalThis.AudioContext;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.Audio = originalAudio;
  globalThis.AudioContext = originalAudioContext;
  globalThis.fetch = originalFetch;
});

test("routes only loops through Web Audio and reports them to diagnostics", async () => {
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  const fetched: string[] = [];
  globalThis.fetch = ((source: string) => {
    fetched.push(source);
    return Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
  }) as typeof fetch;
  const graph: SoundGraph = {
    schemaVersion: 1,
    sounds: {
      music: { source: "music.wav" },
      effect: { source: "effect.wav" },
    },
    nodes: [
      { id: "music", type: "play", soundId: "music", loop: true },
      { id: "effect", type: "play", soundId: "effect" },
    ],
    connections: [],
  };
  const backend = new HuzzleAudioBackend(graph);

  await backend.preload("music.wav");
  await backend.preload("effect.wav");
  await backend.play({
    soundId: "music",
    source: "music.wav",
    bus: "soundtrack",
    loop: true,
    pitch: 1,
    volume: 1,
  });

  expect(fetched).toEqual(["music.wav"]);
  expect(backend.getActiveSounds()[0]).toMatchObject({
    channel: "soundtrack",
    source: "music.wav",
    loop: true,
    duration: 12,
  });
  backend.setSoundFilter([]);
  expect(backend.getActiveSounds()[0]?.muted).toBe(true);
  backend.destroy();
});
