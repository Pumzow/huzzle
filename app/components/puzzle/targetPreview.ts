export type TargetPreviewState = {
  imageUrl: string;
  revealed: boolean;
  won: boolean;
  revealAllowed: boolean;
};

export function targetPreviewMarkup(): string {
  return `<button class="preview-frame" type="button">
    <img alt="" />
    <span class="preview-cover"><strong>Reveal target</strong><small aria-hidden="true">−★</small></span>
    <span class="preview-label">Target image</span>
  </button>`;
}

export class TargetPreview {
  private readonly button: HTMLButtonElement;
  private readonly image: HTMLImageElement;
  private readonly cover: HTMLElement;
  private readonly coverTitle: HTMLElement;
  private readonly cost: HTMLElement;

  constructor(root: ParentNode, private readonly onReveal: () => void) {
    this.button = this.require(root, ".preview-frame");
    this.image = this.require(root, ".preview-frame img");
    this.cover = this.require(root, ".preview-cover");
    this.coverTitle = this.require(root, ".preview-cover strong");
    this.cost = this.require(root, ".preview-cover small");
    this.button.addEventListener("click", this.onReveal);
  }

  private require<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing application element: ${selector}`);
    return element;
  }

  update(state: TargetPreviewState): void {
    this.image.src = state.imageUrl;
    this.image.alt = state.revealed ? "Preview of the completed puzzle" : "";
    this.button.classList.toggle("is-revealed", state.revealed);
    this.button.disabled = state.revealed || state.won || !state.revealAllowed;
    this.button.setAttribute("aria-label", state.revealed
      ? "Target image revealed"
      : state.won
        ? "Target image unavailable after completion"
        : state.revealAllowed ? "Reveal target image for a one-star penalty" : "Target image reveal disabled");
    this.cover.hidden = state.revealed;
    this.coverTitle.textContent = state.won ? "Puzzle complete" : state.revealAllowed ? "Reveal target" : "Target hidden";
    this.cost.hidden = state.won || !state.revealAllowed;
  }

  destroy(): void {
    this.button.removeEventListener("click", this.onReveal);
  }
}
