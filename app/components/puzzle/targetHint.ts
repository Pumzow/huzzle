export type TargetHintState = {
  imageUrl: string;
  visible: boolean;
  used: boolean;
  won: boolean;
  allowed: boolean;
  accessMode: "ad" | "free";
};

export function targetHintButtonMarkup(): string {
  return `<button class="target-hint-button" type="button">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
    <strong>Hint</strong><small data-hint-access>Watch ad</small>
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
  private readonly label: HTMLElement;
  private latestState: TargetHintState | null = null;
  private hideTimer: number | null = null;
  private requesting = false;
  private destroyed = false;
  private wasVisible = false;

  constructor(
    root: ParentNode,
    private readonly onShow: () => Promise<boolean>,
    private readonly onHide: () => void,
    private readonly displayDuration: number,
  ) {
    this.button = requiredElement(root, ".target-hint-button");
    this.image = requiredElement(root, ".target-hint-overlay img");
    this.overlay = requiredElement(root, ".target-hint-overlay");
    this.cost = requiredElement(root, ".target-hint-button small");
    this.label = requiredElement(root, ".target-hint-button strong");
    this.button.addEventListener("click", this.requestHint);
  }

  private requestHint = async () => {
    if (this.button.disabled || this.requesting) return;
    this.requesting = true;
    this.renderButton();
    const shown = await this.onShow().catch(() => false);
    if (this.destroyed) return;
    this.requesting = false;
    this.renderButton();
    if (!shown) return;
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(
      this.hideHint,
      this.displayDuration * 1000,
    );
  };

  private hideHint = () => {
    this.hideTimer = null;
    this.onHide();
  };

  update(state: TargetHintState): void {
    this.latestState = state;
    const visible = state.visible && !state.won && state.allowed;
    this.image.src = state.imageUrl;
    this.overlay.hidden = !visible;
    if (!visible) {
      gsap.killTweensOf(this.overlay);
      gsap.set(this.overlay, { clearProps: "all" });
    }
    if (visible && !this.wasVisible && !prefersReducedMotion()) {
      gsap.fromTo(this.overlay, { autoAlpha: 0, scale: 0.985 }, {
        autoAlpha: 1,
        duration: gameConfig.visualEffects.hint.duration,
        ease: "power2.out",
        scale: 1,
        clearProps: "opacity,visibility,transform",
      });
    }
    this.wasVisible = visible;
    this.renderButton();
    this.button.classList.toggle("is-active", visible);
    this.button.setAttribute("aria-pressed", String(visible));
  }

  private renderButton(): void {
    const state = this.latestState;
    if (!state) return;
    this.button.disabled = this.requesting || state.won || !state.allowed;
    this.button.classList.toggle("is-loading", this.requesting);
    this.label.textContent = this.requesting ? "Loading..." : "Hint";
    this.cost.hidden = state.used || this.requesting;
    this.cost.textContent = state.accessMode === "ad" ? "Watch ad" : "Free";
    this.button.setAttribute("aria-label", state.won
      ? "Target hint unavailable after completion"
      : this.requesting
        ? "Loading target hint"
        : state.used
          ? "Show the target image"
          : state.accessMode === "ad"
            ? "Watch an ad to unlock the target hint"
            : "Show the free target hint");
  }

  destroy(): void {
    this.destroyed = true;
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    gsap.killTweensOf(this.overlay);
    this.button.removeEventListener("click", this.requestHint);
  }
}
import { gsap } from "gsap";
import { gameConfig } from "../../config/gameConfig";
import { prefersReducedMotion } from "../../effects/reducedMotion";
import { requiredElement } from "../../utils/dom";
