import { brandMarkup } from "./brand";
import { soundManager } from "../systems/soundManager";
import { themeManager } from "../systems/themeManager";
import { Theme } from "../types/gameTypes";

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

export function appHeaderMarkup(showBackButton = false): string {
  return `<header class="topbar">
    <div class="topbar-start">${showBackButton ? '<button class="menu-back" type="button" aria-label="Back to main menu">← <span>Menu</span></button>' : ""}${brandMarkup()}</div>
    <div class="topbar-actions"><button class="sound-toggle" type="button"></button><button class="theme-toggle" type="button"></button></div>
  </header>`;
}

export class AppHeader {
  private theme = themeManager.current;
  private muted = soundManager.isMuted("music");
  private readonly soundButton: HTMLButtonElement;
  private readonly themeButton: HTMLButtonElement;
  private readonly backButton: HTMLButtonElement | null;

  constructor(root: ParentNode, private readonly onBack?: () => void) {
    this.soundButton = this.requireButton(root, ".sound-toggle");
    this.themeButton = this.requireButton(root, ".theme-toggle");
    this.backButton = root.querySelector<HTMLButtonElement>(".menu-back");
    this.soundButton.addEventListener("click", this.toggleSound);
    this.themeButton.addEventListener("click", this.toggleTheme);
    this.backButton?.addEventListener("click", this.handleBack);
    this.render();
  }

  private requireButton(root: ParentNode, selector: string): HTMLButtonElement {
    const button = root.querySelector<HTMLButtonElement>(selector);
    if (!button) throw new Error(`Missing application element: ${selector}`);
    return button;
  }

  private toggleSound = () => {
    this.muted = soundManager.toggleMuted("music");
    this.render();
  };

  private handleBack = () => this.onBack?.();

  private toggleTheme = () => {
    this.theme = themeManager.toggle();
    this.render();
  };

  private render(): void {
    this.soundButton.setAttribute("aria-label", this.muted ? "Unmute music" : "Mute music");
    this.soundButton.setAttribute("aria-pressed", String(this.muted));
    this.soundButton.innerHTML = `${soundIcon(this.muted)}<span>${this.muted ? "Music off" : "Music on"}</span>`;
    this.themeButton.setAttribute("aria-label", `Switch to ${this.theme === "light" ? "dark" : "light"} mode`);
    this.themeButton.setAttribute("aria-pressed", String(this.theme === "dark"));
    this.themeButton.innerHTML = `${themeIcon(this.theme)}<span>${this.theme === "light" ? "Dark mode" : "Light mode"}</span>`;
  }

  destroy(): void {
    this.soundButton.removeEventListener("click", this.toggleSound);
    this.themeButton.removeEventListener("click", this.toggleTheme);
    this.backButton?.removeEventListener("click", this.handleBack);
  }
}
