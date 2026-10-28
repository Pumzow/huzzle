import {
  closeAnimatedDialog,
  showAnimatedDialog,
} from "../../effects/dialogEffects";
import { requiredElement } from "../../utils/dom";
import {
  PreferencesControls,
  preferencesControlsMarkup,
} from "../common/preferencesControls";

export function settingsPanelMarkup(): string {
  return `<div class="settings-panel">
    <button class="settings-trigger" type="button" aria-label="Open settings" aria-haspopup="dialog">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>
    </button>
    <dialog class="panel-dialog settings-dialog" aria-labelledby="settings-title">
      <section class="panel-dialog-card settings-card">
        <button class="panel-close settings-close" type="button" aria-label="Close settings">&times;</button>
        <p class="eyebrow">Preferences</p>
        <h2 id="settings-title">Settings</h2>
        ${preferencesControlsMarkup()}
      </section>
    </dialog>
  </div>`;
}

export class SettingsPanel {
  private readonly trigger: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly dialog: HTMLDialogElement;
  private readonly preferences: PreferencesControls;

  constructor(root: ParentNode) {
    this.trigger = requiredElement(root, ".settings-trigger");
    this.closeButton = requiredElement(root, ".settings-close");
    this.dialog = requiredElement(root, ".settings-dialog");
    this.preferences = new PreferencesControls(this.dialog);
    this.trigger.addEventListener("click", this.open);
    this.closeButton.addEventListener("click", this.close);
    this.dialog.addEventListener("click", this.closeFromBackdrop);
  }

  refresh(): void {
    this.preferences.refresh();
  }

  destroy(): void {
    this.preferences.destroy();
    this.trigger.removeEventListener("click", this.open);
    this.closeButton.removeEventListener("click", this.close);
    this.dialog.removeEventListener("click", this.closeFromBackdrop);
  }

  private open = () => {
    this.preferences.refresh();
    showAnimatedDialog(this.dialog);
  };

  private close = () => closeAnimatedDialog(this.dialog);

  private closeFromBackdrop = (event: MouseEvent) => {
    if (event.target === this.dialog) this.close();
  };
}
