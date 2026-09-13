import { SettingsPanel, settingsPanelMarkup } from "../panels/settingsPanel";
import { brandMarkup } from "./brand";

export function appHeaderMarkup(showBackButton = false): string {
  return `<header class="topbar">
    <div class="topbar-start"><button class="menu-back" type="button" aria-label="Back to main menu"${showBackButton ? "" : " hidden"}>&larr; <span>Menu</span></button></div>
    ${brandMarkup("topbar-brand")}
    <div class="topbar-end">${settingsPanelMarkup()}</div>
  </header>`;
}

export class AppHeader {
  private readonly element: HTMLElement;
  private readonly settings: SettingsPanel;
  private readonly backButton: HTMLButtonElement | null;

  constructor(root: ParentNode, private readonly onBack?: () => void) {
    this.element = root.querySelector<HTMLElement>(".topbar")!;
    this.settings = new SettingsPanel(root);
    this.backButton = root.querySelector<HTMLButtonElement>(".menu-back");
    this.backButton?.addEventListener("click", this.handleBack);
  }

  refresh(): void {
    this.settings.refresh();
  }

  update(visible: boolean, showBackButton: boolean): void {
    this.element.hidden = !visible;
    this.backButton!.hidden = !showBackButton;
    if (visible) this.refresh();
  }

  destroy(): void {
    this.settings.destroy();
    this.backButton?.removeEventListener("click", this.handleBack);
  }

  private handleBack = () => this.onBack?.();
}
