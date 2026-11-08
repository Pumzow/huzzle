import {
  closeAnimatedDialog,
  showAnimatedDialog,
} from "../../effects/dialogEffects";
import type { UiPlatform } from "../../utils/deviceCapabilities";
import { requiredElement } from "../../utils/dom";

export type HowToPlayInputCopy = {
  action: string;
  release: string;
};

export function howToPlayInputCopy(
  platform: UiPlatform,
): HowToPlayInputCopy {
  if (platform === "mobile-web" || platform === "android") {
    return {
      action: "Touch and drag a tile into a new slot.",
      release: "Lift your finger inside the playfield to place it.",
    };
  }
  return {
    action: "Click and drag a tile into a new slot.",
    release: "Release the mouse button inside the playfield to place it.",
  };
}

export function howToPlayPanelMarkup(): string {
  return `<div class="how-to-play-panel">
    <button class="account-trigger how-to-play-trigger" type="button" aria-haspopup="dialog">
      <span class="account-initial" aria-hidden="true">?</span>
      <span class="account-trigger-copy"><small>Casual guide</small><strong>How to play</strong></span>
    </button>
    <dialog class="panel-dialog how-to-play-dialog" aria-labelledby="how-to-play-title">
      <section class="panel-dialog-card how-to-play-card">
        <button class="panel-close how-to-play-close" type="button" aria-label="Close how to play">&times;</button>
        <p class="eyebrow">Puzzle basics</p>
        <h2 id="how-to-play-title">How to play</h2>
        <div class="how-to-play-sections">
          <article><span aria-hidden="true">1</span><div><strong>Build the picture</strong><p data-how-to-action></p><p data-how-to-release></p></div></article>
          <article><span aria-hidden="true">2</span><div><strong>Connected tiles move together</strong><p>Correct neighboring tiles connect and can be moved as one group.</p></div></article>
          <article><span aria-hidden="true">3</span><div><strong>Watch your limits</strong><p>Moves and time affect the stars awarded when the puzzle is complete.</p></div></article>
        </div>
        <button class="how-to-play-done" type="button">Got it</button>
      </section>
    </dialog>
  </div>`;
}

export class HowToPlayPanel {
  private readonly dialog: HTMLDialogElement;
  private readonly trigger: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly doneButton: HTMLButtonElement;
  private readonly action: HTMLElement;
  private readonly release: HTMLElement;

  constructor(
    root: ParentNode,
    platform: UiPlatform,
    private readonly onClosed: () => void = () => undefined,
  ) {
    this.dialog = requiredElement(root, ".how-to-play-dialog");
    this.trigger = requiredElement(root, ".how-to-play-trigger");
    this.closeButton = requiredElement(root, ".how-to-play-close");
    this.doneButton = requiredElement(root, ".how-to-play-done");
    this.action = requiredElement(root, "[data-how-to-action]");
    this.release = requiredElement(root, "[data-how-to-release]");
    this.updatePlatform(platform);
    this.trigger.addEventListener("click", this.open);
    this.closeButton.addEventListener("click", this.close);
    this.doneButton.addEventListener("click", this.close);
    this.dialog.addEventListener("click", this.closeFromBackdrop);
    this.dialog.addEventListener("cancel", this.handleCancel);
  }

  open = (): void => showAnimatedDialog(this.dialog);

  updatePlatform(platform: UiPlatform): void {
    const copy = howToPlayInputCopy(platform);
    this.action.textContent = copy.action;
    this.release.textContent = copy.release;
  }

  destroy(): void {
    this.trigger.removeEventListener("click", this.open);
    this.closeButton.removeEventListener("click", this.close);
    this.doneButton.removeEventListener("click", this.close);
    this.dialog.removeEventListener("click", this.closeFromBackdrop);
    this.dialog.removeEventListener("cancel", this.handleCancel);
    if (this.dialog.open) this.dialog.close();
  }

  private close = (): void => closeAnimatedDialog(this.dialog, this.onClosed);

  private closeFromBackdrop = (event: MouseEvent): void => {
    if (event.target === this.dialog) this.close();
  };

  private handleCancel = (event: Event): void => {
    event.preventDefault();
    this.close();
  };
}

