import type { AudioBackend, SoundPlayback } from "@soundtool/engine";
import { soundManager, type SoundChannel, type SoundManager } from "./soundManager";

function channelFor(bus: string): SoundChannel {
  return bus === "soundtrack" ? "soundtrack" : "sfx";
}

export class HuzzleAudioBackend implements AudioBackend {
  constructor(private readonly sounds: SoundManager = soundManager) {}

  async preload(source: string): Promise<void> {
    this.sounds.preloadSound(source);
  }

  play(playback: SoundPlayback): void {
    this.sounds.playSound({
      source: playback.source,
      channel: channelFor(playback.bus),
      group: playback.group,
      loop: playback.loop,
      pitchRange: { min: playback.pitch, max: playback.pitch },
      volume: playback.volume,
    });
  }

  stopAll(): void {
    this.sounds.stopSound();
  }

  stopGroup(group: string): void {
    this.sounds.stopGroup(group);
  }

  setBusVolume(bus: string, volume: number): void {
    this.sounds.setVolume(channelFor(bus), volume);
  }

  destroy(): void {
    this.stopAll();
  }
}
