import { soundManager } from "../systems/soundManager";
import { themeManager } from "../systems/themeManager";
import { Theme } from "../types/gameTypes";

function musicIcon(muted: boolean): string {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>${muted ? '<path d="m3 3 18 18"/>' : ""}</svg>`;
}

function sfxIcon(muted: boolean): string {
  const waves = muted
    ? '<path d="m16 9 5 6M21 9l-5 6"/>'
    : '<path d="M15 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>';
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z"/>${waves}</svg>`;
}

function themeIcon(theme: Theme): string {
  return theme === "light"
    ? '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.3 15.2A8.5 8.5 0 0 1 8.8 3.7 8.5 8.5 0 1 0 20.3 15.2Z"/></svg>'
    : '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3V1.5M12 22.5V21M4.22 4.22 3.16 3.16M20.84 20.84l-1.06-1.06M3 12H1.5M22.5 12H21M4.22 19.78l-1.06 1.06M20.84 3.16l-1.06 1.06"/><circle cx="12" cy="12" r="4.5"/></svg>';
}

export function renderThemeToggle(button: HTMLButtonElement, theme: Theme): void {
  button.setAttribute("aria-label", `Switch to ${theme === "light" ? "dark" : "light"} mode`);
  button.setAttribute("aria-pressed", String(theme === "dark"));
  button.innerHTML = `${themeIcon(theme)}<span>${theme === "light" ? "Dark mode" : "Light mode"}</span>`;
}

export function appHeaderMarkup(showBackButton = false): string {
  return `<header class="topbar">
    <div class="topbar-start">${showBackButton ? '<button class="menu-back" type="button" aria-label="Back to main menu">← <span>Menu</span></button>' : ""}</div>
    <div class="topbar-actions"><button class="music-toggle" type="button"></button><button class="sfx-toggle" type="button"></button><button class="theme-toggle" type="button"></button></div>
  </header>`;
}

export class AppHeader {
  private theme = themeManager.current;
  private musicMuted = soundManager.isMuted("music");
  private sfxMuted = soundManager.isMuted("sfx");
  private readonly musicButton: HTMLButtonElement;
  private readonly sfxButton: HTMLButtonElement;
  private readonly themeButton: HTMLButtonElement;
  private readonly backButton: HTMLButtonElement | null;

  constructor(root: ParentNode, private readonly onBack?: () => void) {
    this.musicButton = this.requireButton(root, ".music-toggle");
    this.sfxButton = this.requireButton(root, ".sfx-toggle");
    this.themeButton = this.requireButton(root, ".theme-toggle");
    this.backButton = root.querySelector<HTMLButtonElement>(".menu-back");
    this.musicButton.addEventListener("click", this.toggleMusic);
    this.sfxButton.addEventListener("click", this.toggleSfx);
    this.themeButton.addEventListener("click", this.toggleTheme);
    this.backButton?.addEventListener("click", this.handleBack);
    this.render();
  }

  private requireButton(root: ParentNode, selector: string): HTMLButtonElement {
    const button = root.querySelector<HTMLButtonElement>(selector);
    if (!button) throw new Error(`Missing application element: ${selector}`);
    return button;
  }

  private toggleMusic = () => {
    this.musicMuted = soundManager.toggleMuted("music");
    this.render();
  };

  private toggleSfx = () => {
    this.sfxMuted = soundManager.toggleMuted("sfx");
    this.render();
  };

  private handleBack = () => this.onBack?.();

  private toggleTheme = () => {
    this.theme = themeManager.toggle();
    this.render();
  };

  private render(): void {
    this.musicButton.setAttribute("aria-label", this.musicMuted ? "Unmute music" : "Mute music");
    this.musicButton.setAttribute("aria-pressed", String(this.musicMuted));
    this.musicButton.innerHTML = `${musicIcon(this.musicMuted)}<span>${this.musicMuted ? "Music off" : "Music on"}</span>`;
    this.sfxButton.setAttribute("aria-label", this.sfxMuted ? "Unmute sound effects" : "Mute sound effects");
    this.sfxButton.setAttribute("aria-pressed", String(this.sfxMuted));
    this.sfxButton.innerHTML = `${sfxIcon(this.sfxMuted)}<span>${this.sfxMuted ? "SFX off" : "SFX on"}</span>`;
    renderThemeToggle(this.themeButton, this.theme);
  }

  destroy(): void {
    this.musicButton.removeEventListener("click", this.toggleMusic);
    this.sfxButton.removeEventListener("click", this.toggleSfx);
    this.themeButton.removeEventListener("click", this.toggleTheme);
    this.backButton?.removeEventListener("click", this.handleBack);
  }
}
