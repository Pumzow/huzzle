import {
  closeAnimatedDialog,
  showAnimatedDialog,
} from "../../effects/dialogEffects";
import { requiredElement } from "../../utils/dom";

export function challengeUnlockPanelMarkup(): string {
  return `<dialog class="panel-dialog challenge-unlock-dialog" aria-labelledby="challenge-unlock-title">
    <section class="panel-dialog-card challenge-unlock-card">
      <div class="challenge-unlock-mark" aria-hidden="true">◆</div>
      <p class="eyebrow">New mode available</p>
      <h2 id="challenge-unlock-title">Challenge unlocked!</h2>
      <p>Challenge mode is now available.</p>
      <button class="challenge-unlock-confirm" type="button">Got it</button>
    </section>
  </dialog>`;
}

export class ChallengeUnlockPanel {
  private readonly dialog: HTMLDialogElement;
  private readonly confirmButton: HTMLButtonElement;

  constructor(
    root: ParentNode,
    private readonly onConfirmed: () => void,
  ) {
    this.dialog = requiredElement(root, ".challenge-unlock-dialog");
    this.confirmButton = requiredElement(root, ".challenge-unlock-confirm");
    this.confirmButton.addEventListener("click", this.confirm);
    this.dialog.addEventListener("click", this.closeFromBackdrop);
    this.dialog.addEventListener("cancel", this.handleCancel);
  }

  open(): void {
    showAnimatedDialog(this.dialog);
  }

  destroy(): void {
    this.confirmButton.removeEventListener("click", this.confirm);
    this.dialog.removeEventListener("click", this.closeFromBackdrop);
    this.dialog.removeEventListener("cancel", this.handleCancel);
    if (this.dialog.open) this.dialog.close();
  }

  private confirm = (): void =>
    closeAnimatedDialog(this.dialog, this.onConfirmed);

  private closeFromBackdrop = (event: MouseEvent): void => {
    if (event.target === this.dialog) this.confirm();
  };

  private handleCancel = (event: Event): void => {
    event.preventDefault();
    this.confirm();
  };
}
