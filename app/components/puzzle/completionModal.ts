import { gameConfig } from "../../config/gameConfig";
import { triggerBackgroundReaction } from "../../systems/visualEffects";

type CompletionModalConfig = {
  allowNextLevel: boolean;
};

export function completionModalMarkup(config: CompletionModalConfig): string {
  const nextLevelButton = config.allowNextLevel
    ? '<button class="next-level-button" type="button"><span>Next puzzle</span><b aria-hidden="true">→</b></button>'
    : "";
  return `<div class="win-card" hidden><div class="win-burst" aria-hidden="true">${"<i></i>".repeat(8)}</div><div class="win-result" role="status"><div class="win-stars"></div><strong data-win-message></strong><p class="win-points" data-win-points hidden></p></div>${nextLevelButton}</div>`;
}

export function completionMessage(earnedStars: number): string {
  return earnedStars === 3 ? "Excellent!" : earnedStars === 2 ? "Well done!" : "Puzzle completed!";
}

export function completionPointsMessage(pointsAwarded: number, isCheater: boolean): string {
  if (isCheater) return "No points for cheaters";
  return pointsAwarded > 0 ? `+${pointsAwarded} points` : "";
}

export class CompletionModal {
  private readonly card: HTMLElement;
  private readonly stars: HTMLElement;
  private readonly message: HTMLElement;
  private readonly points: HTMLElement;
  private readonly boardWrap: HTMLElement | null;
  private readonly nextLevelButton: HTMLButtonElement | null;
  private pointsAnimationFrame: number | null = null;
  private displayedPoints = 0;
  private targetPoints = 0;
  private wasWon = false;

  constructor(root: ParentNode, private readonly onNextLevel?: () => void) {
    this.card = this.require(root, ".win-card");
    this.stars = this.require(root, ".win-stars");
    this.message = this.require(root, "[data-win-message]");
    this.points = this.require(root, "[data-win-points]");
    this.boardWrap = root.querySelector<HTMLElement>(".canvas-wrap");
    this.nextLevelButton = root.querySelector<HTMLButtonElement>(".next-level-button");
    this.nextLevelButton?.addEventListener("click", this.loadNextLevel);
  }

  private require(root: ParentNode, selector: string): HTMLElement {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing application element: ${selector}`);
    return element;
  }

  update(
    won: boolean,
    earnedStars: number,
    startingStars: number,
    pointsAwarded = 0,
    isCheater = false,
  ): void {
    const message = completionMessage(earnedStars);
    if (won && !this.wasWon) triggerBackgroundReaction("completion");
    this.wasWon = won;
    this.card.hidden = !won;
    this.boardWrap?.classList.toggle("is-complete", won);
    this.stars.setAttribute("aria-label", `${earnedStars} out of ${startingStars} stars`);
    const completionEffect = gameConfig.visualEffects.completion;
    this.stars.innerHTML = Array.from({ length: startingStars }, (_, index) => {
      const delay = completionEffect.starInitialDelayMs + index * completionEffect.starStaggerMs;
      return `<i class="${index < earnedStars ? "is-earned" : ""}" style="--star-delay:${delay}ms">★</i>`;
    }).join("");
    this.message.textContent = message;
    this.points.hidden = !isCheater && pointsAwarded <= 0;
    if (!won || isCheater || pointsAwarded <= 0) {
      this.cancelPointsAnimation();
      this.displayedPoints = 0;
      this.targetPoints = 0;
      this.points.classList.remove("is-impact");
      this.points.textContent = completionPointsMessage(pointsAwarded, isCheater);
    } else if (pointsAwarded !== this.targetPoints) {
      this.animatePoints(pointsAwarded);
    }
  }

  private animatePoints(target: number): void {
    this.cancelPointsAnimation();
    const startValue = this.displayedPoints;
    const startTime = performance.now();
    const duration = gameConfig.visualEffects.pointsReward.countDurationMs;
    this.targetPoints = target;
    this.points.classList.remove("is-impact");

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.displayedPoints = Math.round(startValue + (target - startValue) * eased);
      this.points.textContent = completionPointsMessage(this.displayedPoints, false);
      if (progress < 1) {
        this.pointsAnimationFrame = requestAnimationFrame(tick);
        return;
      }
      this.pointsAnimationFrame = null;
      this.points.classList.add("is-impact");
    };

    this.pointsAnimationFrame = requestAnimationFrame(tick);
  }

  private cancelPointsAnimation(): void {
    if (this.pointsAnimationFrame !== null) cancelAnimationFrame(this.pointsAnimationFrame);
    this.pointsAnimationFrame = null;
  }

  private loadNextLevel = () => this.onNextLevel?.();

  destroy(): void {
    this.cancelPointsAnimation();
    this.nextLevelButton?.removeEventListener("click", this.loadNextLevel);
    this.boardWrap?.classList.remove("is-complete");
  }
}
