import { appConfig, resolveAssetPath } from "../config/appConfig";
import { soundManager } from "../systems/soundManager";
import { Theme } from "../types/gameTypes";

const soundtrack = resolveAssetPath(appConfig.soundtrack.file);

function initialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(appConfig.theme.storageKey);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // The system preference remains available when browser storage is disabled.
  }
  if (appConfig.theme.default !== "system") return appConfig.theme.default;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function soundIcon(muted: boolean): string {
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

export function appHeaderMarkup(): string {
  return `<header class="topbar">
    <div class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><strong class="brand-name">Huzzle</strong></div>
    <div class="topbar-actions"><button class="sound-toggle" type="button"></button><button class="theme-toggle" type="button"></button></div>
  </header>`;
}

export class AppHeader {
  private theme = initialTheme();
  private muted: boolean = appConfig.soundtrack.initiallyMuted;
  private readonly soundButton: HTMLButtonElement;
  private readonly themeButton: HTMLButtonElement;

  constructor(root: ParentNode) {
    this.soundButton = this.requireButton(root, ".sound-toggle");
    this.themeButton = this.requireButton(root, ".theme-toggle");
    this.soundButton.addEventListener("click", this.toggleSound);
    this.themeButton.addEventListener("click", this.toggleTheme);
    this.applyTheme();
    soundManager.setMuted(this.muted);
    if (appConfig.soundtrack.enabled) soundManager.playSound(soundtrack, appConfig.soundtrack.loop);
    this.render();
  }

  private requireButton(root: ParentNode, selector: string): HTMLButtonElement {
    const button = root.querySelector<HTMLButtonElement>(selector);
    if (!button) throw new Error(`Missing application element: ${selector}`);
    return button;
  }

  private toggleSound = () => {
    this.muted = !this.muted;
    soundManager.setMuted(this.muted);
    this.render();
  };

  private toggleTheme = () => {
    this.theme = this.theme === "light" ? "dark" : "light";
    this.applyTheme();
  };

  private applyTheme(): void {
    document.documentElement.dataset.theme = this.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", appConfig.theme.colors[this.theme]);
    try {
      window.localStorage.setItem(appConfig.theme.storageKey, this.theme);
    } catch {
      // Theme selection still works for this session when storage is unavailable.
    }
    this.render();
  }

  private render(): void {
    this.soundButton.setAttribute("aria-label", this.muted ? "Unmute soundtrack" : "Mute soundtrack");
    this.soundButton.setAttribute("aria-pressed", String(this.muted));
    this.soundButton.innerHTML = `${soundIcon(this.muted)}<span>${this.muted ? "Sound off" : "Sound on"}</span>`;
    this.themeButton.setAttribute("aria-label", `Switch to ${this.theme === "light" ? "dark" : "light"} mode`);
    this.themeButton.setAttribute("aria-pressed", String(this.theme === "dark"));
    this.themeButton.innerHTML = `${themeIcon(this.theme)}<span>${this.theme === "light" ? "Dark mode" : "Light mode"}</span>`;
  }

  destroy(): void {
    this.soundButton.removeEventListener("click", this.toggleSound);
    this.themeButton.removeEventListener("click", this.toggleTheme);
    if (appConfig.soundtrack.enabled) soundManager.stopSound(soundtrack);
  }
}
