export function completionModalMarkup(): string {
  return '<div class="win-card" role="status" hidden><div class="win-stars"></div><strong data-win-message></strong></div>';
}

export function completionMessage(earnedStars: number): string {
  return earnedStars === 3 ? "Excellent!" : earnedStars === 2 ? "Well done!" : "Puzzle completed!";
}

export class CompletionModal {
  private readonly card: HTMLElement;
  private readonly stars: HTMLElement;
  private readonly message: HTMLElement;

  constructor(root: ParentNode) {
    this.card = this.require(root, ".win-card");
    this.stars = this.require(root, ".win-stars");
    this.message = this.require(root, "[data-win-message]");
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
}
