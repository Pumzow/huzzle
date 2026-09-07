import {
  PreferencesControls,
  preferencesControlsMarkup,
} from "./preferencesControls";

export function appHeaderMarkup(showBackButton = false): string {
  return `<header class="topbar">
    <div class="topbar-start">${showBackButton ? '<button class="menu-back" type="button" aria-label="Back to main menu">&larr; <span>Menu</span></button>' : ""}</div>
    ${preferencesControlsMarkup("header")}
  </header>`;
}

export class AppHeader {
  private readonly preferences: PreferencesControls;
  private readonly backButton: HTMLButtonElement | null;

  constructor(root: ParentNode, private readonly onBack?: () => void) {
    this.preferences = new PreferencesControls(root, "header");
    this.backButton = root.querySelector<HTMLButtonElement>(".menu-back");
    this.backButton?.addEventListener("click", this.handleBack);
  }

  destroy(): void {
    this.preferences.destroy();
    this.backButton?.removeEventListener("click", this.handleBack);
  }

  private handleBack = () => this.onBack?.();
}
