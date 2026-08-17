export class SoundManager {
  private sounds = new Map<string, HTMLAudioElement>();
  private pendingSounds = new Set<string>();
  private muted = false;
  private unlockListening = false;

  private unlock = () => {
    this.pendingSounds.forEach((sound) => {
      const audio = this.sounds.get(sound);
      if (!audio) {
        this.pendingSounds.delete(sound);
        return;
      }
      void audio.play().then(() => this.pendingSounds.delete(sound)).catch(() => undefined);
    });
    if (this.pendingSounds.size === 0) this.removeUnlockListeners();
  };

  playSound(sound: string, loop = false): HTMLAudioElement {
    this.stopSound(sound);
    const audio = new Audio(sound);
    audio.loop = loop;
    audio.muted = this.muted;
    audio.preload = "auto";
    this.sounds.set(sound, audio);
    void audio.play().catch(() => {
      if (this.sounds.get(sound) !== audio) return;
      this.pendingSounds.add(sound);
      this.addUnlockListeners();
    });
    return audio;
  }

  stopSound(sound?: string): void {
    const soundsToStop = sound ? [[sound, this.sounds.get(sound)] as const] : [...this.sounds.entries()];
    soundsToStop.forEach(([key, audio]) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      this.sounds.delete(key);
      this.pendingSounds.delete(key);
    });
    if (this.pendingSounds.size === 0) this.removeUnlockListeners();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.sounds.forEach((audio) => { audio.muted = muted; });
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
