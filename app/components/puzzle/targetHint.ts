export type TargetHintState = {
  imageUrl: string;
  visible: boolean;
  used: boolean;
  won: boolean;
  allowed: boolean;
};

export function targetHintButtonMarkup(): string {
  return `<button class="target-hint-button" type="button">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
    <strong>Hint</strong><small>-1 <span aria-hidden="true">★</span></small>
  </button>`;
}

export function targetHintOverlayMarkup(): string {
  return `<div class="target-hint-overlay" hidden aria-hidden="true">
    <img alt="" draggable="false" />
    <span>Target image</span>
  </div>`;
}

export class TargetHint {
  private readonly button: HTMLButtonElement;
  private readonly image: HTMLImageElement;
  private readonly overlay: HTMLElement;
  private readonly cost: HTMLElement;
  private activePointerId: number | null = null;
  private keyboardActive = false;

  constructor(
    root: ParentNode,
    private readonly onShow: () => void,
    private readonly onHide: () => void,
  ) {
    this.button = this.require(root, ".target-hint-button");
    this.image = this.require(root, ".target-hint-overlay img");
    this.overlay = this.require(root, ".target-hint-overlay");
    this.cost = this.require(root, ".target-hint-button small");
    this.button.addEventListener("pointerdown", this.handlePointerDown);
    this.button.addEventListener("pointerup", this.handlePointerEnd);
    this.button.addEventListener("pointercancel", this.handlePointerEnd);
    this.button.addEventListener("lostpointercapture", this.handleLostPointerCapture);
    this.button.addEventListener("keydown", this.handleKeyDown);
    this.button.addEventListener("keyup", this.handleKeyUp);
    this.button.addEventListener("blur", this.releaseKeyboard);
    this.button.addEventListener("contextmenu", this.preventContextMenu);
  }

  private require<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing application element: ${selector}`);
    return element;
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (this.button.disabled || this.activePointerId !== null) return;
    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.button.setPointerCapture(event.pointerId);
    window.addEventListener("pointerup", this.handlePointerEnd, true);
    window.addEventListener("pointercancel", this.handlePointerEnd, true);
    this.onShow();
  };

  private handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.removeWindowPointerListeners();
    this.button.classList.remove("is-active");
    this.overlay.hidden = true;
    if (this.button.hasPointerCapture(event.pointerId)) {
      this.button.releasePointerCapture(event.pointerId);
    }
    this.onHide();
  };

  private handleLostPointerCapture = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.removeWindowPointerListeners();
    this.button.classList.remove("is-active");
    this.overlay.hidden = true;
    this.onHide();
  };

  private removeWindowPointerListeners(): void {
    window.removeEventListener("pointerup", this.handlePointerEnd, true);
    window.removeEventListener("pointercancel", this.handlePointerEnd, true);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if ((event.key !== " " && event.key !== "Enter") || event.repeat || this.keyboardActive) return;
    event.preventDefault();
    this.keyboardActive = true;
    this.onShow();
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    this.releaseKeyboard();
  };

  private releaseKeyboard = () => {
    if (!this.keyboardActive) return;
    this.keyboardActive = false;
    this.onHide();
  };

  private preventContextMenu = (event: Event) => event.preventDefault();

  update(state: TargetHintState): void {
    const visible = state.visible && !state.won && state.allowed;
    this.image.src = state.imageUrl;
    this.overlay.hidden = !visible;
    this.button.disabled = state.won || !state.allowed;
    this.button.classList.toggle("is-active", visible);
    this.cost.hidden = state.used;
    this.button.setAttribute("aria-pressed", String(visible));
    this.button.setAttribute("aria-label", state.won
      ? "Target hint unavailable after completion"
      : state.used
        ? "Hold to show the target image"
        : "Hold to show the target image for a one-star penalty");
  }

  destroy(): void {
    this.removeWindowPointerListeners();
    this.button.removeEventListener("pointerdown", this.handlePointerDown);
    this.button.removeEventListener("pointerup", this.handlePointerEnd);
    this.button.removeEventListener("pointercancel", this.handlePointerEnd);
    this.button.removeEventListener("lostpointercapture", this.handleLostPointerCapture);
    this.button.removeEventListener("keydown", this.handleKeyDown);
    this.button.removeEventListener("keyup", this.handleKeyUp);
    this.button.removeEventListener("blur", this.releaseKeyboard);
    this.button.removeEventListener("contextmenu", this.preventContextMenu);
  }
}
