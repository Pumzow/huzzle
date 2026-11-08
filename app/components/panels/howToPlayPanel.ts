import {
  closeAnimatedDialog,
  showAnimatedDialog,
} from "../../effects/dialogEffects";
import type { UiPlatform } from "../../utils/deviceCapabilities";
import { requiredElement } from "../../utils/dom";

export type HowToPlayInputCopy = {
  instruction: string;
};

export function howToPlayInputCopy(
  platform: UiPlatform,
): HowToPlayInputCopy {
  if (platform === "mobile-web" || platform === "android") {
    return {
      instruction:
        "Drag tiles around to rebuild the picture. Release your finger to drop a tile into place.",
    };
  }
  return {
    instruction:
      "Drag tiles around to rebuild the picture. Release the mouse button to drop a tile into place.",
  };
}

export function howToPlayPanelMarkup(): string {
  return `<div class="how-to-play-panel">
    <button class="account-trigger how-to-play-trigger" type="button" aria-haspopup="dialog">
      <span class="account-initial" aria-hidden="true">?</span>
      <span class="account-trigger-copy"><strong>How to play</strong></span>
    </button>
    <dialog class="panel-dialog how-to-play-dialog" aria-labelledby="how-to-play-title">
      <section class="panel-dialog-card how-to-play-card">
        <button class="panel-close how-to-play-close" type="button" aria-label="Close how to play">&times;</button>
        <h2 id="how-to-play-title">How to play</h2>
        <div class="how-to-play-sections">
          <article><span aria-hidden="true">1</span><div><strong>Put the pieces together</strong><p data-how-to-instruction></p></div></article>
          <article><span aria-hidden="true">2</span><div><strong>Move tiles together</strong><p>Tiles that match up will connect. Once joined, you can move them as a group.</p></div></article>
          <article><span aria-hidden="true">3</span><div><strong>Go for three stars</strong><p>Finish the puzzle with fewer moves and a faster time to earn more stars.</p></div></article>
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
  private readonly instruction: HTMLElement;

  constructor(
    root: ParentNode,
    platform: UiPlatform,
    private readonly onClosed: () => void = () => undefined,
  ) {
    this.dialog = requiredElement(root, ".how-to-play-dialog");
    this.trigger = requiredElement(root, ".how-to-play-trigger");
    this.closeButton = requiredElement(root, ".how-to-play-close");
    this.doneButton = requiredElement(root, ".how-to-play-done");
    this.instruction = requiredElement(root, "[data-how-to-instruction]");
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
    this.instruction.textContent = copy.instruction;
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

