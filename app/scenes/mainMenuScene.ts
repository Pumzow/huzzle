import { brandMarkup } from "../components/brand";
import { SoundChannel, soundManager } from "../systems/soundManager";

type MainMenuActions = {
  onPlay: () => void;
  onCustomLevel: (file: File) => void;
};

function audioIcon(channel: SoundChannel, muted: boolean): string {
  if (channel === "music") {
    return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>${muted ? '<path d="m3 3 18 18"/>' : ""}</svg>`;
  }
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z"/>${muted ? '<path d="m16 9 5 6M21 9l-5 6"/>' : '<path d="M15 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>'}</svg>`;
}

export class MainMenuScene {
  private readonly playButton: HTMLButtonElement;
  private readonly customInput: HTMLInputElement;
  private readonly musicButton: HTMLButtonElement;
  private readonly sfxButton: HTMLButtonElement;

  constructor(private readonly root: HTMLElement, private readonly actions: MainMenuActions) {
    root.innerHTML = `<main class="scene-shell menu-scene">
      <div class="menu-decoration menu-decoration-one" aria-hidden="true"></div>
      <div class="menu-decoration menu-decoration-two" aria-hidden="true"></div>
      <section class="menu-card" aria-labelledby="main-menu-title">
        ${brandMarkup("menu-brand")}
        <div class="menu-heading">
          <p class="eyebrow">Swap · connect · complete</p>
          <h1 id="main-menu-title">Picture puzzles,<br>piece by piece.</h1>
        </div>
        <div class="menu-actions">
          <button class="menu-action menu-play" type="button"><span>Play</span><b aria-hidden="true">→</b></button>
          <label class="menu-action menu-custom"><span>Custom Level</span><b aria-hidden="true">＋</b><input type="file" accept="image/*"></label>
        </div>
        <div class="menu-audio" aria-label="Audio settings">
          <button class="menu-audio-button music-mute" type="button"></button>
          <button class="menu-audio-button sfx-mute" type="button"></button>
        </div>
      </section>
    </main>`;

    this.playButton = this.requireElement<HTMLButtonElement>(".menu-play");
    this.customInput = this.requireElement<HTMLInputElement>(".menu-custom input");
    this.musicButton = this.requireElement<HTMLButtonElement>(".music-mute");
    this.sfxButton = this.requireElement<HTMLButtonElement>(".sfx-mute");
    this.playButton.addEventListener("click", this.actions.onPlay);
    this.customInput.addEventListener("change", this.handleCustomLevel);
    this.musicButton.addEventListener("click", this.toggleMusic);
    this.sfxButton.addEventListener("click", this.toggleSfx);
    this.renderAudioButtons();
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing main menu element: ${selector}`);
    return element;
  }

  private handleCustomLevel = () => {
    const file = this.customInput.files?.[0];
    if (!file) return;
    this.actions.onCustomLevel(file);
  };

  private toggleMusic = () => {
    soundManager.toggleMuted("music");
    this.renderAudioButtons();
  };

  private toggleSfx = () => {
    soundManager.toggleMuted("sfx");
    this.renderAudioButtons();
  };

  private renderAudioButton(button: HTMLButtonElement, channel: SoundChannel, label: string): void {
    const muted = soundManager.isMuted(channel);
    button.setAttribute("aria-label", `${muted ? "Unmute" : "Mute"} ${label.toLowerCase()}`);
    button.setAttribute("aria-pressed", String(muted));
    button.innerHTML = `${audioIcon(channel, muted)}<span>${label}</span><small>${muted ? "Off" : "On"}</small>`;
  }

  private renderAudioButtons(): void {
    this.renderAudioButton(this.musicButton, "music", "Music");
    this.renderAudioButton(this.sfxButton, "sfx", "SFX");
  }

  destroy(): void {
    this.playButton.removeEventListener("click", this.actions.onPlay);
    this.customInput.removeEventListener("change", this.handleCustomLevel);
    this.musicButton.removeEventListener("click", this.toggleMusic);
    this.sfxButton.removeEventListener("click", this.toggleSfx);
    this.root.replaceChildren();
  }
}
