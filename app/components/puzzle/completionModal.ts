type CompletionModalConfig = {
  allowNextLevel: boolean;
};

export function completionModalMarkup(config: CompletionModalConfig): string {
  const nextLevelButton = config.allowNextLevel
    ? '<button class="next-level-button" type="button"><span>Next puzzle</span><b aria-hidden="true">→</b></button>'
    : "";
  return `<div class="win-card" hidden><div class="win-result" role="status"><div class="win-stars"></div><strong data-win-message></strong></div>${nextLevelButton}</div>`;
}

export function completionMessage(earnedStars: number): string {
  return earnedStars === 3 ? "Excellent!" : earnedStars === 2 ? "Well done!" : "Puzzle completed!";
}

export class CompletionModal {
  private readonly card: HTMLElement;
  private readonly stars: HTMLElement;
  private readonly message: HTMLElement;
  private readonly nextLevelButton: HTMLButtonElement | null;

  constructor(root: ParentNode, private readonly onNextLevel?: () => void) {
    this.card = this.require(root, ".win-card");
    this.stars = this.require(root, ".win-stars");
    this.message = this.require(root, "[data-win-message]");
    this.nextLevelButton = root.querySelector<HTMLButtonElement>(".next-level-button");
    this.nextLevelButton?.addEventListener("click", this.loadNextLevel);
  }

  private require(root: ParentNode, selector: string): HTMLElement {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing application element: ${selector}`);
    return element;
  }

  update(won: boolean, earnedStars: number, startingStars: number): void {
    const message = completionMessage(earnedStars);
    this.card.hidden = !won;
    this.stars.setAttribute("aria-label", `${earnedStars} out of ${startingStars} stars`);
    this.stars.innerHTML = `${"★".repeat(earnedStars)}<span>${"★".repeat(startingStars - earnedStars)}</span>`;
    this.message.textContent = message;
  }

  private loadNextLevel = () => this.onNextLevel?.();

  destroy(): void {
    this.nextLevelButton?.removeEventListener("click", this.loadNextLevel);
  }
}
