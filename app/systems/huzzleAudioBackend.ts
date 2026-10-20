import type { AudioBackend, SoundPlayback } from "@soundtool/engine";
import type { SoundChannel } from "../types/gameTypes";
import { soundManager } from "./soundManager";

function channelFor(bus: string): SoundChannel {
  return bus === "soundtrack" ? "soundtrack" : "sfx";
}

export class HuzzleAudioBackend implements AudioBackend {
  async preload(source: string): Promise<void> {
    soundManager.preloadSound(source);
  }

  play(playback: SoundPlayback): void {
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
  }

  stopGroup(group: string): void {
    soundManager.stopGroup(group);
  }

  setBusVolume(bus: string, volume: number): void {
    soundManager.setVolume(channelFor(bus), volume);
  }

  destroy(): void {
    this.stopAll();
  }
}
