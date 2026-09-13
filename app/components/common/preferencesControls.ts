import { deviceFeedback } from "../../systems/deviceFeedback";
import { soundManager, type SoundChannel } from "../../systems/soundManager";
import { themeManager } from "../../systems/themeManager";
import type { Theme } from "../../types/gameTypes";
import { requiredElement } from "../../utils/dom";

function audioIcon(channel: SoundChannel, muted: boolean): string {
  if (channel === "music") {
    return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>${muted ? '<path d="m3 3 18 18"/>' : ""}</svg>`;
  }
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z"/>${
    muted
      ? '<path d="m16 9 5 6M21 9l-5 6"/>'
      : '<path d="M15 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>'
  }</svg>`;
}

function themeIcon(theme: Theme): string {
  return theme === "light"
    ? '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.3 15.2A8.5 8.5 0 0 1 8.8 3.7 8.5 8.5 0 1 0 20.3 15.2Z"/></svg>'
    : '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3V1.5M12 22.5V21M4.22 4.22 3.16 3.16M20.84 20.84l-1.06-1.06M3 12H1.5M22.5 12H21M4.22 19.78l-1.06 1.06M20.84 3.16l-1.06 1.06"/><circle cx="12" cy="12" r="4.5"/></svg>';
}

function hapticsIcon(enabled: boolean): string {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 7.5v9M15 7.5v9M5.5 10v4M18.5 10v4"/>${enabled ? '<path d="M2.5 11v2M21.5 11v2"/>' : '<path d="m3 3 18 18"/>'}</svg>`;
}

export function preferencesControlsMarkup(): string {
  return `<div class="settings-preferences" aria-label="Game preferences">
    <button class="preference-row music-toggle" type="button"></button>
    <button class="preference-row sfx-toggle" type="button"></button>
    <button class="preference-row theme-toggle" type="button"></button>
    <button class="preference-row haptics-toggle" type="button"></button>
  </div>`;
}

export class PreferencesControls {
  private theme = themeManager.current;
  private musicMuted = soundManager.isMuted("music");
  private sfxMuted = soundManager.isMuted("sfx");
  private hapticsEnabled = deviceFeedback.isEnabled();
  private readonly musicButton: HTMLButtonElement;
  private readonly sfxButton: HTMLButtonElement;
  private readonly hapticsButton: HTMLButtonElement;
  private readonly themeButton: HTMLButtonElement;

  constructor(root: ParentNode) {
    this.musicButton = requiredElement(root, ".music-toggle");
    this.sfxButton = requiredElement(root, ".sfx-toggle");
    this.hapticsButton = requiredElement(root, ".haptics-toggle");
    this.themeButton = requiredElement(root, ".theme-toggle");
    this.musicButton.addEventListener("click", this.toggleMusic);
    this.sfxButton.addEventListener("click", this.toggleSfx);
    this.hapticsButton.addEventListener("click", this.toggleHaptics);
    this.themeButton.addEventListener("click", this.toggleTheme);
    this.render();
  }

  refresh(): void {
    this.theme = themeManager.current;
    this.musicMuted = soundManager.isMuted("music");
    this.sfxMuted = soundManager.isMuted("sfx");
    this.hapticsEnabled = deviceFeedback.isEnabled();
    this.render();
  }

  destroy(): void {
    this.musicButton.removeEventListener("click", this.toggleMusic);
    this.sfxButton.removeEventListener("click", this.toggleSfx);
    this.hapticsButton.removeEventListener("click", this.toggleHaptics);
    this.themeButton.removeEventListener("click", this.toggleTheme);
  }

  private toggleMusic = () => {
    this.musicMuted = soundManager.toggleMuted("music");
    this.renderAudioButton(this.musicButton, "music", "Music", this.musicMuted);
  };

  private toggleSfx = () => {
    this.sfxMuted = soundManager.toggleMuted("sfx");
    this.renderAudioButton(this.sfxButton, "sfx", "Sound effects", this.sfxMuted);
  };

  private toggleHaptics = () => {
    this.hapticsEnabled = deviceFeedback.toggleEnabled();
    this.renderHapticsButton();
  };

  private toggleTheme = () => {
    this.theme = themeManager.toggle(this.themeButton);
    this.renderThemeButton();
  };

  private render(): void {
    this.renderAudioButton(this.musicButton, "music", "Music", this.musicMuted);
    this.renderAudioButton(this.sfxButton, "sfx", "Sound effects", this.sfxMuted);
    this.renderThemeButton();
    this.hapticsButton.hidden = !deviceFeedback.isAvailable();
    this.renderHapticsButton();
  }

  private renderAudioButton(
    button: HTMLButtonElement,
    channel: SoundChannel,
    label: string,
    muted: boolean,
  ): void {
    button.setAttribute("aria-label", `${muted ? "Enable" : "Disable"} ${label.toLowerCase()}`);
    button.setAttribute("aria-pressed", String(!muted));
    button.innerHTML = `${audioIcon(channel, muted)}<strong>${label}</strong><small>${muted ? "Off" : "On"}</small>`;
  }

  private renderThemeButton(): void {
    const nextTheme = this.theme === "light" ? "dark" : "light";
    this.themeButton.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
    this.themeButton.setAttribute("aria-pressed", String(this.theme === "dark"));
    this.themeButton.innerHTML = `${themeIcon(this.theme)}<strong>Theme</strong><small>${this.theme === "light" ? "Light" : "Dark"}</small>`;
  }

  private renderHapticsButton(): void {
    this.hapticsButton.setAttribute("aria-label", `${this.hapticsEnabled ? "Disable" : "Enable"} haptics`);
    this.hapticsButton.setAttribute("aria-pressed", String(this.hapticsEnabled));
    this.hapticsButton.innerHTML = `${hapticsIcon(this.hapticsEnabled)}<strong>Haptics</strong><small>${this.hapticsEnabled ? "On" : "Off"}</small>`;
  }
}
