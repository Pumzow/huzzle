import { gsap } from "gsap";
import { gameConfig } from "../../config/gameConfig";
import { prefersReducedMotion } from "../../effects/reducedMotion";
import { requiredElement } from "../../utils/dom";
import type { PuzzleBoardBounds } from "../../types/gameTypes";

export type TargetHintState = {
  imageUrl: string;
  visible: boolean;
  used: boolean;
  won: boolean;
  allowed: boolean;
  accessMode: "ad" | "free";
  tileBounds: PuzzleBoardBounds | null;
};

const accessIcons = {
  ad: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3V9Z"/></svg>',
  free: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M9 10V7a3 3 0 0 1 5.7-1.3"/></svg>',
} as const;

export function targetHintButtonMarkup(): string {
  return `<button class="target-hint-button" type="button">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
    <strong>Hint</strong><small data-hint-access>${accessIcons.ad}</small>
  </button>`;
}

export function targetHintOverlayMarkup(): string {
  return `<div class="target-hint-overlay" hidden aria-hidden="true">
    <img alt="" draggable="false" />
  </div>`;
}

export class TargetHint {
  private readonly button: HTMLButtonElement;
  private readonly image: HTMLImageElement;
  private readonly overlay: HTMLElement;
  private readonly cost: HTMLElement;
  private readonly label: HTMLElement;
  private latestState: TargetHintState | null = null;
  private activePointerId: number | null = null;
  private keyboardActive = false;
  private requesting = false;
  private destroyed = false;
  private wasVisible = false;

  constructor(
    root: ParentNode,
    private readonly onUnlock: () => Promise<boolean>,
    private readonly onShow: () => void,
    private readonly onHide: () => void,
  ) {
    this.button = requiredElement(root, ".target-hint-button");
    this.image = requiredElement(root, ".target-hint-overlay img");
    this.overlay = requiredElement(root, ".target-hint-overlay");
    this.cost = requiredElement(root, ".target-hint-button small");
    this.label = requiredElement(root, ".target-hint-button strong");
    this.button.addEventListener("pointerdown", this.handlePointerDown);
    this.button.addEventListener("pointerup", this.handlePointerEnd);
    this.button.addEventListener("pointercancel", this.handlePointerEnd);
    this.button.addEventListener("lostpointercapture", this.handleLostPointerCapture);
    this.button.addEventListener("keydown", this.handleKeyDown);
    this.button.addEventListener("keyup", this.handleKeyUp);
    this.button.addEventListener("blur", this.releaseKeyboard);
    this.button.addEventListener("contextmenu", this.preventContextMenu);
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (this.button.disabled || this.requesting || this.activePointerId !== null)
      return;
    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.button.setPointerCapture(event.pointerId);
    window.addEventListener("pointerup", this.handlePointerEnd, true);
    window.addEventListener("pointercancel", this.handlePointerEnd, true);
    void this.unlockForPointer(event.pointerId);
  };

  private async unlockForPointer(pointerId: number): Promise<void> {
    const unlocked = await this.requestUnlock();
    if (unlocked && this.activePointerId === pointerId) this.onShow();
  }

  private handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.removeWindowPointerListeners();
    if (this.button.hasPointerCapture(event.pointerId)) {
      this.button.releasePointerCapture(event.pointerId);
    }
    this.onHide();
  };

  private handleLostPointerCapture = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.removeWindowPointerListeners();
    this.onHide();
  };

  private removeWindowPointerListeners(): void {
    window.removeEventListener("pointerup", this.handlePointerEnd, true);
    window.removeEventListener("pointercancel", this.handlePointerEnd, true);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (
      (event.key !== " " && event.key !== "Enter") ||
      event.repeat ||
      this.keyboardActive ||
      this.requesting ||
      this.button.disabled
    )
      return;
    event.preventDefault();
    this.keyboardActive = true;
    void this.unlockForKeyboard();
  };

  private async unlockForKeyboard(): Promise<void> {
    const unlocked = await this.requestUnlock();
    if (unlocked && this.keyboardActive) this.onShow();
  }

  private async requestUnlock(): Promise<boolean> {
    this.requesting = true;
    this.renderButton();
    const unlocked = await this.onUnlock().catch(() => false);
    if (this.destroyed) return false;
    this.requesting = false;
    this.renderButton();
    return unlocked;
  }

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
    this.latestState = state;
    const visible = state.visible && !state.won && state.allowed;
    this.image.src = state.imageUrl;
    if (state.tileBounds) {
      this.overlay.style.left = `${state.tileBounds.x}px`;
      this.overlay.style.top = `${state.tileBounds.y}px`;
      this.overlay.style.width = `${state.tileBounds.width}px`;
      this.overlay.style.height = `${state.tileBounds.height}px`;
    } else {
      this.overlay.style.removeProperty("left");
      this.overlay.style.removeProperty("top");
      this.overlay.style.removeProperty("width");
      this.overlay.style.removeProperty("height");
    }
    this.overlay.hidden = !visible;
    if (!visible) {
      gsap.killTweensOf(this.overlay);
      gsap.set(this.overlay, { clearProps: "all" });
    }
    if (visible && !this.wasVisible && !prefersReducedMotion()) {
      gsap.fromTo(
        this.overlay,
        { autoAlpha: 0, scale: 0.985 },
        {
          autoAlpha: 1,
          duration: gameConfig.visualEffects.hint.duration,
          ease: "power2.out",
          scale: 1,
          clearProps: "opacity,visibility,transform",
        },
      );
    }
    this.wasVisible = visible;
    this.renderButton();
    this.button.classList.toggle("is-active", visible);
    this.button.setAttribute("aria-pressed", String(visible));
  }

  private renderButton(): void {
    const state = this.latestState;
    if (!state) return;
    this.button.disabled = state.won || !state.allowed;
    this.button.classList.toggle("is-loading", this.requesting);
    this.label.textContent = this.requesting ? "Loading..." : "Hint";
    this.cost.hidden = state.used || this.requesting;
    this.cost.innerHTML = accessIcons[state.accessMode];
    this.button.setAttribute(
      "aria-label",
      state.won
        ? "Target hint unavailable after completion"
        : this.requesting
          ? "Loading target hint"
          : state.used
            ? "Hold to show the target image"
            : state.accessMode === "ad"
              ? "Hold to watch an ad and unlock the target hint"
              : "Hold to unlock and show the free target hint",
    );
  }

  destroy(): void {
    this.destroyed = true;
    gsap.killTweensOf(this.overlay);
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
