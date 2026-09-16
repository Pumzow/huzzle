import { appConfig } from "../config/appConfig";

export type SoundChannel = "soundtrack" | "sfx";

export type SoundPitchRange = {
  min: number;
  max: number;
};

export type SoundPlaybackOptions = {
  channel?: SoundChannel;
  group?: string;
  loop?: boolean;
  pitchRange?: SoundPitchRange;
  source: string;
  volume?: number;
};

type ActiveSound = {
  audio: HTMLAudioElement;
  channel: SoundChannel;
  group?: string;
  source: string;
  volume: number;
};

function clampVolume(volume: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 1));
}

export function randomPlaybackRate(
  range: SoundPitchRange | undefined,
  random: () => number = Math.random
): number {
  if (!range) return 1;
  const minimum = Math.max(0.25, Math.min(range.min, range.max));
  const maximum = Math.min(4, Math.max(range.min, range.max));
  if (
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    minimum > maximum
  )
    return 1;
  return minimum + (maximum - minimum) * Math.min(1, Math.max(0, random()));
}

function storedMuted(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    if (value === "true" || value === "false") return value === "true";
  } catch {
    // Use the configured fallback when storage is unavailable.
  }
  return fallback;
}

export class SoundManager {
  private sounds = new Map<number, ActiveSound>();
  private pendingSounds = new Set<number>();
  private preloadedSounds = new Map<string, HTMLAudioElement>();
  private muted: Record<SoundChannel, boolean> = {
    soundtrack: storedMuted(
      appConfig.soundtrack.storageKey,
      appConfig.soundtrack.initiallyMuted
    ),
    sfx: storedMuted(appConfig.sfx.storageKey, appConfig.sfx.initiallyMuted),
  };
  private channelVolumes: Record<SoundChannel, number> = {
    soundtrack: 1,
    sfx: 1,
  };
  private unlockListening = false;
  private nextSoundId = 0;

  private unlock = () => {
    this.pendingSounds.forEach((soundId) => {
      const activeSound = this.sounds.get(soundId);
      if (!activeSound) {
        this.pendingSounds.delete(soundId);
        return;
      }
      void activeSound.audio
        .play()
        .then(() => this.pendingSounds.delete(soundId))
        .catch(() => undefined);
    });
    if (this.pendingSounds.size === 0) this.removeUnlockListeners();
  };

  preloadSound(sound: string): void {
    if (this.preloadedSounds.has(sound) || typeof Audio === "undefined") return;
    const audio = new Audio(sound);
    audio.preload = "auto";
    audio.load();
    this.preloadedSounds.set(sound, audio);
  }

  playSound(options: SoundPlaybackOptions): HTMLAudioElement {
    const {
      source,
      loop = false,
      channel = "sfx",
      group,
      pitchRange,
      volume = 1,
    } = options;
    if (loop) this.stopSound(source);
    const preloaded = this.preloadedSounds.get(source);
    const audio = preloaded
      ? (preloaded.cloneNode(true) as HTMLAudioElement)
      : new Audio(source);
    audio.loop = loop;
    audio.muted = this.muted[channel];
    audio.preload = "auto";
    audio.playbackRate = randomPlaybackRate(pitchRange);
    const soundVolume = clampVolume(volume);
    audio.volume = soundVolume * this.channelVolumes[channel];
    audio.preservesPitch = false;
    const soundId = ++this.nextSoundId;
    this.sounds.set(soundId, { audio, channel, group, source, volume: soundVolume });
    audio.addEventListener("ended", () => this.removeSound(soundId), {
      once: true,
    });
    void audio.play().catch(() => {
      if (this.sounds.get(soundId)?.audio !== audio) return;
      this.pendingSounds.add(soundId);
      this.addUnlockListeners();
    });
    return audio;
  }

  stopSound(sound?: string): void {
    this.stopMatching(
      (activeSound) => sound === undefined || activeSound.source === sound
    );
  }

  stopGroup(group: string): void {
    this.stopMatching((activeSound) => activeSound.group === group);
  }

  private stopMatching(predicate: (sound: ActiveSound) => boolean): void {
    const soundsToStop = [...this.sounds.entries()].filter(([, activeSound]) =>
      predicate(activeSound)
    );
    soundsToStop.forEach(([soundId, activeSound]) => {
      activeSound.audio.pause();
      activeSound.audio.currentTime = 0;
      this.sounds.delete(soundId);
      this.pendingSounds.delete(soundId);
    });
    if (this.pendingSounds.size === 0) this.removeUnlockListeners();
  }

  isMuted(channel: SoundChannel): boolean {
    return this.muted[channel];
  }

  toggleMuted(channel: SoundChannel): boolean {
    const muted = !this.muted[channel];
    this.setMuted(channel, muted);
    return muted;
  }

  setMuted(channel: SoundChannel, muted: boolean): void {
    this.muted[channel] = muted;
    this.sounds.forEach((activeSound) => {
      if (activeSound.channel === channel) activeSound.audio.muted = muted;
    });
    const storageKey =
      channel === "soundtrack"
        ? appConfig.soundtrack.storageKey
        : appConfig.sfx.storageKey;
    try {
      window.localStorage.setItem(storageKey, String(muted));
    } catch {
      // Muting still works for the current session when storage is unavailable.
    }
  }

  setVolume(channel: SoundChannel, volume: number): void {
    this.channelVolumes[channel] = clampVolume(volume);
    this.sounds.forEach((activeSound) => {
      if (activeSound.channel === channel) {
        activeSound.audio.volume = activeSound.volume * this.channelVolumes[channel];
      }
    });
  }

  private addUnlockListeners(): void {
    if (this.unlockListening) return;
    this.unlockListening = true;
    document.addEventListener("pointerdown", this.unlock, true);
    document.addEventListener("keydown", this.unlock, true);
  }

  private removeSound(soundId: number): void {
    this.sounds.delete(soundId);
    this.pendingSounds.delete(soundId);
    if (this.pendingSounds.size === 0) this.removeUnlockListeners();
  }

  private removeUnlockListeners(): void {
    if (!this.unlockListening) return;
    this.unlockListening = false;
    document.removeEventListener("pointerdown", this.unlock, true);
    document.removeEventListener("keydown", this.unlock, true);
  }
}

export const soundManager = new SoundManager();
