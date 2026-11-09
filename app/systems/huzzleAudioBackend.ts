import {
  linearCurve,
  WebAudioBackend,
  type AudioBackend,
  type AutomationCurve,
  type SoundGraph,
  type SoundPlayback,
} from "@soundtool/engine";
import type { ActiveSoundSnapshot } from "@pumzow/game-engine";
import type { SoundChannel } from "../types/gameTypes";
import { soundManager } from "./soundManager";

function channelFor(bus: string): SoundChannel {
  return bus === "soundtrack" ? "soundtrack" : "sfx";
}

export class HuzzleAudioBackend implements AudioBackend {
  private readonly sources = new Map<string, string>();
  private readonly loopSources: Set<string>;
  private readonly loopSoundIds = new Set<string>();
  private readonly loopBackend = new WebAudioBackend();
  private readonly stopChannelSync: () => void;

  constructor(
    graph: SoundGraph,
    resolveSource: (source: string) => string = (source) => source,
  ) {
    this.loopSources = new Set(
      graph.nodes.flatMap((node) => {
        if (node.type !== "play" || !node.loop) return [];
        const asset = graph.sounds[node.soundId];
        return asset ? [resolveSource(asset.source)] : [];
      }),
    );
    this.stopChannelSync = soundManager.onChannelStateChange(
      (channel, { muted, volume }) => {
        this.loopBackend.setBusVolume(channel, muted ? 0 : volume);
      },
    );
  }

  async preload(source: string): Promise<void> {
    if (this.loopSources.has(source)) await this.loopBackend.preload(source);
    else soundManager.preloadSound(source);
  }

  async play(playback: SoundPlayback): Promise<void> {
    this.sources.set(playback.soundId, playback.source);
    if (playback.loop) {
      this.loopBackend.stopSound(playback.soundId, 0, linearCurve);
      this.loopSoundIds.add(playback.soundId);
      await this.loopBackend.play(playback);
      return;
    }
    soundManager.playSound({
      source: playback.source,
      channel: channelFor(playback.bus),
      group: playback.group,
      loop: playback.loop,
      pitchRange: { min: playback.pitch, max: playback.pitch },
      volume: playback.volume,
    });
  }

  stopAll(): void {
    soundManager.stopSound();
    this.loopBackend.stopAll();
    this.loopSoundIds.clear();
  }

  stopGroup(group: string): void {
    soundManager.stopGroup(group);
    this.loopBackend.stopGroup(group);
  }

  setBusVolume(bus: string, volume: number): void {
    soundManager.setVolume(channelFor(bus), volume);
  }

  getActiveSounds(): ActiveSoundSnapshot<SoundChannel>[] {
    return this.loopBackend.getActiveSounds().map((sound) => ({
      id: -sound.id,
      channel: channelFor(sound.bus),
      loop: sound.loop,
      source: sound.source,
      currentTime: sound.currentTime,
      duration: sound.duration,
      paused: sound.paused,
      pending: sound.pending,
      muted: sound.muted,
      volume: sound.volume,
    }));
  }

  getKnownSoundSources(): string[] {
    return [...this.loopSources].sort((left, right) => left.localeCompare(right));
  }

  setSoundFilter(sources: Iterable<string> | null): void {
    this.loopBackend.setSoundFilter(sources);
  }

  updateSoundVolume(
    soundId: string,
    volume: number,
    seconds: number,
    curve: AutomationCurve,
  ): void {
    if (this.loopSoundIds.has(soundId)) {
      this.loopBackend.updateSoundVolume(soundId, volume, seconds, curve);
      return;
    }
    const source = this.sources.get(soundId);
    if (source) soundManager.setSoundVolume(source, volume);
  }

  destroy(): void {
    this.stopAll();
    this.stopChannelSync();
    this.loopBackend.destroy();
    this.sources.clear();
  }
}
