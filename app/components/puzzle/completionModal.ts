import { gameConfig } from "../../config/gameConfig";
import { triggerBackgroundReaction } from "../../systems/visualEffects";

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
  return `<div class="win-card" hidden><div class="win-burst" aria-hidden="true">${"<i></i>".repeat(8)}</div><div class="win-result" role="status"><div class="win-stars"></div><strong data-win-message></strong><p class="win-points" data-win-points hidden></p></div>${nextLevelButton}${shuffleButton}</div>`;
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
  private readonly shuffleButton: HTMLButtonElement | null;
  private pointsAnimationTimer: number | null = null;
  private pointsAnimationFrame: number | null = null;
  private completionStartedAt: number | null = null;
  private displayedPoints = 0;
  private targetPoints = 0;
  private renderedStarsKey = "";
  private wasWon = false;

  constructor(root: ParentNode, private readonly actions: CompletionModalActions = {}) {
    this.card = this.require(root, ".win-card");
    this.stars = this.require(root, ".win-stars");
    this.message = this.require(root, "[data-win-message]");
    this.points = this.require(root, "[data-win-points]");
    this.boardWrap = root.querySelector<HTMLElement>(".canvas-wrap");
    this.nextLevelButton = root.querySelector<HTMLButtonElement>(".next-level-button");
    this.shuffleButton = root.querySelector<HTMLButtonElement>(".shuffle-puzzle-button");
    this.nextLevelButton?.addEventListener("click", this.loadNextLevel);
    this.shuffleButton?.addEventListener("click", this.shuffleAgain);
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
    const completedNow = won && !this.wasWon;
    const sequence = this.sequenceTiming(earnedStars, pointsAwarded, isCheater);
    this.card.style.setProperty("--completion-message-delay", `${sequence.messageStartMs}ms`);
    this.card.style.setProperty("--completion-points-delay", `${sequence.pointsStartMs}ms`);
    this.card.style.setProperty("--completion-actions-delay", `${sequence.actionsStartMs}ms`);
    if (completedNow) {
      this.completionStartedAt = performance.now();
      triggerBackgroundReaction("completion");
    } else if (!won) {
      this.completionStartedAt = null;
    }
    this.wasWon = won;
    this.card.hidden = !won;
    if (completedNow) {
      this.card.classList.remove("is-revealing");
      void this.card.offsetWidth;
      this.card.classList.add("is-revealing");
    } else if (!won) {
      this.card.classList.remove("is-revealing");
    }
    this.boardWrap?.classList.toggle("is-complete", won);
    this.stars.setAttribute("aria-label", `${earnedStars} out of ${startingStars} stars`);
    const completionEffect = gameConfig.visualEffects.completion;
    const starsKey = `${earnedStars}:${startingStars}`;
    if (starsKey !== this.renderedStarsKey) {
      this.renderedStarsKey = starsKey;
      this.stars.innerHTML = Array.from({ length: startingStars }, (_, index) => {
        const delay = completionEffect.starInitialDelayMs + index * completionEffect.starStaggerMs;
        return `<i class="${index < earnedStars ? "is-earned" : ""}" style="--star-delay:${delay}ms">★</i>`;
      }).join("");
    }
    this.message.textContent = message;
    this.points.hidden = !isCheater && pointsAwarded <= 0;
    this.points.classList.toggle("is-sequenced-message", isCheater);
    if (!won || isCheater || pointsAwarded <= 0) {
      this.cancelPointsAnimation();
      this.displayedPoints = 0;
      this.targetPoints = 0;
      this.points.classList.remove("is-impact");
      this.points.textContent = completionPointsMessage(pointsAwarded, isCheater);
    } else if (pointsAwarded !== this.targetPoints) {
      this.animatePoints(pointsAwarded, earnedStars);
    }
  }

  private sequenceTiming(earnedStars: number, pointsAwarded: number, isCheater: boolean) {
    const completion = gameConfig.visualEffects.completion;
    const points = gameConfig.visualEffects.pointsReward;
    const starsEndMs = completion.starInitialDelayMs
      + Math.max(0, earnedStars - 1) * completion.starStaggerMs
      + completion.starDurationMs;
    const messageStartMs = starsEndMs + completion.messageDelayAfterStarsMs;
    const messageEndMs = messageStartMs + completion.messageDurationMs;
    const pointsStartMs = messageEndMs + points.delayAfterMessageMs;
    const pointsEndMs = pointsAwarded > 0
      ? pointsStartMs + points.countDurationMs + points.impactDurationMs
      : isCheater
        ? pointsStartMs + points.impactDurationMs
        : messageEndMs;
    return {
      messageStartMs,
      pointsStartMs,
      actionsStartMs: pointsEndMs + completion.actionsDelayAfterPointsMs,
    };
  }

  private animatePoints(target: number, earnedStars: number): void {
    this.cancelPointsAnimation();
    const pointsEffect = gameConfig.visualEffects.pointsReward;
    const pointsStartMs = this.sequenceTiming(earnedStars, target, false).pointsStartMs;
    const completionElapsed = this.completionStartedAt === null
      ? 0
      : performance.now() - this.completionStartedAt;
    const delay = Math.max(0, pointsStartMs - completionElapsed);
    this.targetPoints = target;
    this.points.classList.remove("is-impact");

    this.pointsAnimationTimer = window.setTimeout(() => {
      this.pointsAnimationTimer = null;
      const startValue = this.displayedPoints;
      const startTime = performance.now();
      const tick = (time: number) => {
        const progress = Math.min(1, (time - startTime) / pointsEffect.countDurationMs);
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
    }, delay);
  }

  private cancelPointsAnimation(): void {
    if (this.pointsAnimationTimer !== null) window.clearTimeout(this.pointsAnimationTimer);
    if (this.pointsAnimationFrame !== null) cancelAnimationFrame(this.pointsAnimationFrame);
    this.pointsAnimationTimer = null;
    this.pointsAnimationFrame = null;
  }

  private loadNextLevel = () => this.actions.onNextLevel?.();
  private shuffleAgain = () => this.actions.onShuffle?.();

  destroy(): void {
    this.cancelPointsAnimation();
    this.nextLevelButton?.removeEventListener("click", this.loadNextLevel);
    this.shuffleButton?.removeEventListener("click", this.shuffleAgain);
    this.boardWrap?.classList.remove("is-complete");
  }
}
