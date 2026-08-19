import { appConfig } from "../config/appConfig";

export type SoundChannel = "music" | "sfx";

type ActiveSound = {
  audio: HTMLAudioElement;
  channel: SoundChannel;
};

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
  private sounds = new Map<string, ActiveSound>();
  private pendingSounds = new Set<string>();
  private muted: Record<SoundChannel, boolean> = {
    music: storedMuted(appConfig.soundtrack.storageKey, appConfig.soundtrack.initiallyMuted),
    sfx: storedMuted(appConfig.sfx.storageKey, appConfig.sfx.initiallyMuted),
  };
  private unlockListening = false;

  private unlock = () => {
    this.pendingSounds.forEach((sound) => {
      const activeSound = this.sounds.get(sound);
      if (!activeSound) {
        this.pendingSounds.delete(sound);
        return;
      }
      void activeSound.audio.play().then(() => this.pendingSounds.delete(sound)).catch(() => undefined);
    });
    if (this.pendingSounds.size === 0) this.removeUnlockListeners();
  };

  playSound(sound: string, loop = false, channel: SoundChannel = "sfx"): HTMLAudioElement {
    this.stopSound(sound);
    const audio = new Audio(sound);
    audio.loop = loop;
    audio.muted = this.muted[channel];
    audio.preload = "auto";
    this.sounds.set(sound, { audio, channel });
    void audio.play().catch(() => {
      if (this.sounds.get(sound)?.audio !== audio) return;
      this.pendingSounds.add(sound);
      this.addUnlockListeners();
    });
    return audio;
  }

  stopSound(sound?: string): void {
    const soundsToStop = sound ? [[sound, this.sounds.get(sound)] as const] : [...this.sounds.entries()];
    soundsToStop.forEach(([key, activeSound]) => {
      if (!activeSound) return;
      activeSound.audio.pause();
      activeSound.audio.currentTime = 0;
      this.sounds.delete(key);
      this.pendingSounds.delete(key);
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
    const storageKey = channel === "music" ? appConfig.soundtrack.storageKey : appConfig.sfx.storageKey;
    try {
      window.localStorage.setItem(storageKey, String(muted));
    } catch {
      // Muting still works for the current session when storage is unavailable.
    }
  }

  private addUnlockListeners(): void {
    if (this.unlockListening) return;
    this.unlockListening = true;
    document.addEventListener("pointerdown", this.unlock, true);
    document.addEventListener("keydown", this.unlock, true);
  }

  private removeUnlockListeners(): void {
    if (!this.unlockListening) return;
    this.unlockListening = false;
    document.removeEventListener("pointerdown", this.unlock, true);
    document.removeEventListener("keydown", this.unlock, true);
  }
}

export const soundManager = new SoundManager();
