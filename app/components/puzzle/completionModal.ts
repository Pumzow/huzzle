import { triggerBackgroundReaction } from "../../effects/ambientEffects";
import { CompletionSequence } from "../../effects/completion/completionSequence";
import {
  completionMessage,
  completionPointsMessage,
} from "../../presenters/puzzleCompletion";
import { requiredElement } from "../../utils/dom";

type CompletionModalConfig = {
  allowNextLevel: boolean;
  allowShuffle: boolean;
};

type CompletionModalActions = {
  onNextLevel?: () => void;
  onShuffle?: () => void;
};

export function completionModalMarkup(config: CompletionModalConfig): string {
  const nextLevelButton = config.allowNextLevel
    ? '<button class="completion-action-button next-level-button" type="button"><span>Next puzzle</span><b aria-hidden="true">→</b></button>'
    : "";
  const shuffleButton = config.allowShuffle
    ? '<button class="completion-action-button shuffle-puzzle-button" type="button"><span>Shuffle again</span><b aria-hidden="true">↻</b></button>'
    : "";
  return `<div class="win-card" hidden><div class="win-burst" aria-hidden="true">${"<i></i>".repeat(
    8,
  )}</div><div class="win-result" role="status"><div class="win-stars"></div><strong data-win-message></strong><p class="win-points" data-win-points hidden><span data-win-points-value></span><i class="win-points-ring" aria-hidden="true"></i></p></div>${nextLevelButton}${shuffleButton}</div>`;
}

export { completionMessage, completionPointsMessage };

export class CompletionModal {
  private readonly card: HTMLElement;
  private readonly stars: HTMLElement;
  private readonly message: HTMLElement;
  private readonly points: HTMLElement;
  private readonly pointsValue: HTMLElement;
  private readonly nextLevelButton: HTMLButtonElement | null;
  private readonly shuffleButton: HTMLButtonElement | null;
  private readonly sequence: CompletionSequence;
  private renderedStarsKey = "";
  private wasWon = false;

  constructor(
    root: ParentNode,
    private readonly actions: CompletionModalActions = {},
  ) {
    this.card = requiredElement(root, ".win-card");
    this.stars = requiredElement(root, ".win-stars");
    this.message = requiredElement(root, "[data-win-message]");
    this.points = requiredElement(root, "[data-win-points]");
    this.pointsValue = requiredElement(root, "[data-win-points-value]");
    this.nextLevelButton = root.querySelector(".next-level-button");
    this.shuffleButton = root.querySelector(".shuffle-puzzle-button");
    this.nextLevelButton?.addEventListener("click", this.loadNextLevel);
    this.shuffleButton?.addEventListener("click", this.shuffleAgain);
    this.sequence = new CompletionSequence({
      card: this.card,
      stars: this.stars,
      message: this.message,
      points: this.points,
      pointsValue: this.pointsValue,
      pointsRing: requiredElement(root, ".win-points-ring"),
      boardWrap: root.querySelector(".canvas-wrap"),
      canvasHost: root.querySelector(".canvas-host"),
      actionButtons: [this.nextLevelButton, this.shuffleButton].filter(
        (button): button is HTMLButtonElement => button !== null,
      ),
    });
  }

  update(
    won: boolean,
    earnedStars: number,
    startingStars: number,
    pointsAwarded = 0,
    isCheater = false,
  ): void {
    const completedNow = won && !this.wasWon;
    this.wasWon = won;
    this.card.hidden = !won;
    if (!won) {
      this.sequence.reset();
      return;
    }

    this.stars.setAttribute(
      "aria-label",
      `${earnedStars} out of ${startingStars} stars`,
    );
    const starsKey = `${earnedStars}:${startingStars}`;
    if (starsKey !== this.renderedStarsKey) {
      this.renderedStarsKey = starsKey;
      this.stars.innerHTML = Array.from(
        { length: startingStars },
        (_, index) =>
          `<i class="${index < earnedStars ? "is-earned" : ""}">★</i>`,
      ).join("");
    }
    this.message.textContent = completionMessage(earnedStars);
    this.points.hidden = !isCheater && pointsAwarded <= 0;
    this.pointsValue.textContent = completionPointsMessage(
      isCheater ? 0 : pointsAwarded,
      isCheater,
    );

    if (completedNow) {
      triggerBackgroundReaction("completion");
      this.sequence.play(earnedStars, pointsAwarded, isCheater);
    }
  }

  private loadNextLevel = () => this.actions.onNextLevel?.();
  private shuffleAgain = () => this.actions.onShuffle?.();

  destroy(): void {
    this.sequence.destroy();
    this.nextLevelButton?.removeEventListener("click", this.loadNextLevel);
    this.shuffleButton?.removeEventListener("click", this.shuffleAgain);
  }
}
