import { gsap } from "gsap";
import { gameConfig } from "../../config/gameConfig";
import { triggerBackgroundReaction } from "../../systems/visualEffects";
import { Utils } from "../../utils/utils";

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
    8
  )}</div><div class="win-result" role="status"><div class="win-stars"></div><strong data-win-message></strong><p class="win-points" data-win-points hidden><span data-win-points-value></span><i class="win-points-ring" aria-hidden="true"></i></p></div>${nextLevelButton}${shuffleButton}</div>`;
}

export function completionMessage(earnedStars: number): string {
  return earnedStars === 3
    ? "Excellent!"
    : earnedStars === 2
    ? "Well done!"
    : "Puzzle completed!";
}

export function completionPointsMessage(
  pointsAwarded: number,
  isCheater: boolean
): string {
  if (isCheater) return "No points for cheaters";
  return pointsAwarded > 0 ? `+${pointsAwarded} points` : "";
}

export class CompletionModal {
  private readonly card: HTMLElement;
  private readonly stars: HTMLElement;
  private readonly message: HTMLElement;
  private readonly points: HTMLElement;
  private readonly pointsValue: HTMLElement;
  private readonly pointsRing: HTMLElement;
  private readonly boardWrap: HTMLElement | null;
  private readonly canvasHost: HTMLElement | null;
  private readonly wave: HTMLElement | null;
  private readonly nextLevelButton: HTMLButtonElement | null;
  private readonly shuffleButton: HTMLButtonElement | null;
  private timeline: gsap.core.Timeline | null = null;
  private renderedStarsKey = "";
  private wasWon = false;

  constructor(
    root: ParentNode,
    private readonly actions: CompletionModalActions = {}
  ) {
    this.card = this.require(root, ".win-card");
    this.stars = this.require(root, ".win-stars");
    this.message = this.require(root, "[data-win-message]");
    this.points = this.require(root, "[data-win-points]");
    this.pointsValue = this.require(root, "[data-win-points-value]");
    this.pointsRing = this.require(root, ".win-points-ring");
    this.boardWrap = root.querySelector<HTMLElement>(".canvas-wrap");
    this.canvasHost = root.querySelector<HTMLElement>(".canvas-host");
    this.wave = this.boardWrap ? document.createElement("i") : null;
    if (this.wave) {
      this.wave.className = "completion-wave";
      this.wave.setAttribute("aria-hidden", "true");
      this.boardWrap!.append(this.wave);
    }
    this.nextLevelButton =
      root.querySelector<HTMLButtonElement>(".next-level-button");
    this.shuffleButton = root.querySelector<HTMLButtonElement>(
      ".shuffle-puzzle-button"
    );
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
    isCheater = false
  ): void {
    const completedNow = won && !this.wasWon;
    this.wasWon = won;
    this.card.hidden = !won;

    if (!won) {
      this.resetSequence();
      return;
    }

    this.stars.setAttribute(
      "aria-label",
      `${earnedStars} out of ${startingStars} stars`
    );
    const starsKey = `${earnedStars}:${startingStars}`;
    if (starsKey !== this.renderedStarsKey) {
      this.renderedStarsKey = starsKey;
      this.stars.innerHTML = Array.from(
        { length: startingStars },
        (_, index) =>
          `<i class="${index < earnedStars ? "is-earned" : ""}">★</i>`
      ).join("");
    }

    this.message.textContent = completionMessage(earnedStars);
    this.points.hidden = !isCheater && pointsAwarded <= 0;
    this.pointsValue.textContent = completionPointsMessage(
      isCheater ? 0 : pointsAwarded,
      isCheater
    );

    if (completedNow) {
      triggerBackgroundReaction("completion");
      this.playSequence(earnedStars, pointsAwarded, isCheater);
    }
  }

  private playSequence(
    earnedStars: number,
    pointsAwarded: number,
    isCheater: boolean
  ): void {
    this.resetSequence();
    const completion = gameConfig.visualEffects.completion;
    const pointsEffect = completion.points;
    const earnedStarElements = Array.from(
      this.stars.querySelectorAll<HTMLElement>(".is-earned")
    );
    const actionButtons = [this.nextLevelButton, this.shuffleButton].filter(
      (button): button is HTMLButtonElement => button !== null
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.pointsValue.textContent = completionPointsMessage(
        pointsAwarded,
        isCheater
      );
      return;
    }

    gsap.set(this.card, { autoAlpha: 0, xPercent: -50, y: 14 });
    gsap.set(earnedStarElements, {
      autoAlpha: 0,
      filter: "brightness(1.8)",
      rotation: -28,
      scale: 0.05,
      y: 12,
    });
    gsap.set(this.message, {
      autoAlpha: 0,
      filter: "blur(4px)",
      scale: 0.72,
      y: 8,
    });
    gsap.set(actionButtons, {
      autoAlpha: 0,
      filter: "blur(5px)",
      pointerEvents: "none",
    });
    if (!this.points.hidden)
      gsap.set(this.points, { autoAlpha: 0, scale: 0.72, y: 8 });
    if (pointsAwarded > 0 && !isCheater)
      this.pointsValue.textContent = completionPointsMessage(0, false);

    const timeline = gsap.timeline();
    this.timeline = timeline;
    this.addBoardEffects(timeline);
    this.addParticleEffects(timeline);
    timeline.to(
      this.card,
      {
        autoAlpha: 1,
        duration: completion.modal.duration,
        ease: "power2.out",
        xPercent: -50,
        y: 0,
      },
      completion.modal.delayBeforeShow
    );

    earnedStarElements.slice(0, earnedStars).forEach((star, index) => {
      const starStart =
        completion.stars.delays.beforeFirstShow +
        index * completion.stars.delays.betweenShows;
      const peakDuration = completion.stars.duration * 0.65;
      timeline.to(
        star,
        {
          autoAlpha: 1,
          duration: peakDuration,
          ease: "power2.out",
          filter: "brightness(1.35)",
          rotation: 8,
          scale: completion.stars.peakScale,
          y: -3,
        },
        starStart
      );
      timeline.to(
        star,
        {
          duration: completion.stars.duration - peakDuration,
          ease: "power2.inOut",
          filter: "brightness(1)",
          rotation: 0,
          scale: 1,
          y: 0,
        },
        starStart + peakDuration
      );
    });

    timeline.to(
      this.message,
      {
        autoAlpha: 1,
        duration: completion.message.duration,
        ease: "back.out(1.7)",
        filter: "blur(0px)",
        scale: 1,
        y: 0,
      },
      completion.message.delayBeforeShow
    );

    if (!this.points.hidden) {
      if (pointsAwarded > 0 && !isCheater) {
        const counter = { value: 0 };
        timeline.to(
          this.points,
          {
            autoAlpha: 1,
            duration: pointsEffect.countDuration,
            ease: "power3.out",
            scale: 1,
            y: 0,
          },
          pointsEffect.delayBeforeShow
        );
        timeline.to(
          counter,
          {
            duration: pointsEffect.countDuration,
            ease: "power3.out",
            onUpdate: () => {
              this.pointsValue.textContent = completionPointsMessage(
                Math.round(counter.value),
                false
              );
            },
            value: pointsAwarded,
          },
          pointsEffect.delayBeforeShow
        );
        const impactStart =
          pointsEffect.delayBeforeShow + pointsEffect.countDuration;
        Utils.bangUp(this.points, {
          at: impactStart,
          duration: pointsEffect.impactDuration,
          peakScale: pointsEffect.peakScale,
          ring: this.pointsRing,
          timeline,
        });
      } else {
        timeline.to(
          this.points,
          {
            autoAlpha: 1,
            duration: pointsEffect.impactDuration,
            ease: "back.out(1.7)",
            scale: 1,
            y: 0,
          },
          pointsEffect.delayBeforeShow
        );
      }
    }

    const actionsDelay = this.points.hidden
      ? completion.actions.delays.beforeShowWithoutPoints
      : isCheater
      ? completion.actions.delays.beforeShowForCheater
      : completion.actions.delays.beforeShow;
    timeline.to(
      actionButtons,
      {
        autoAlpha: 1,
        duration: completion.actions.duration,
        ease: "power2.out",
        filter: "blur(0px)",
        pointerEvents: "auto",
      },
      actionsDelay
    );
  }

  private addBoardEffects(timeline: gsap.core.Timeline): void {
    const effect = gameConfig.visualEffects.completion.wave;
    if (this.wave) {
      timeline.fromTo(this.wave, {
        autoAlpha: 0,
        scale: 0.94,
      }, {
        autoAlpha: 1,
        duration: effect.duration * 0.34,
        ease: "power2.out",
      }, effect.delayBeforeStart).to(this.wave, {
        autoAlpha: 0,
        duration: effect.duration * 0.66,
        ease: "power2.inOut",
        scale: effect.scale,
      }, effect.delayBeforeStart + effect.duration * 0.34);
    }
    if (this.canvasHost) {
      timeline.to(this.canvasHost, {
        duration: effect.duration * 0.24,
        ease: "power2.out",
        filter: `brightness(${effect.boardImpactBrightness})`,
        scale: effect.boardImpactScale,
      }, effect.delayBeforeStart).to(this.canvasHost, {
        duration: effect.duration * 0.76,
        ease: "elastic.out(1,.55)",
        filter: "brightness(1)",
        scale: 1,
      }, effect.delayBeforeStart + effect.duration * 0.24);
    }
  }

  private addParticleEffects(timeline: gsap.core.Timeline): void {
    const effect = gameConfig.visualEffects.completion.particles;
    const particles = Array.from(this.card.querySelectorAll<HTMLElement>(".win-burst i"));
    const burst = this.card.querySelector<HTMLElement>(".win-burst");
    if (burst) gsap.set(burst, { scale: effect.scale });
    particles.forEach((particle, index) => {
      gsap.set(particle, { height: effect.sizePx, width: effect.sizePx });
      const style = getComputedStyle(particle);
      const x = style.getPropertyValue("--burst-x").trim();
      const y = style.getPropertyValue("--burst-y").trim();
      timeline.fromTo(particle, {
        autoAlpha: 0,
        rotation: 0,
        scale: 0.2,
        xPercent: -50,
        yPercent: -50,
      }, {
        autoAlpha: 1,
        duration: effect.duration * 0.24,
        ease: "power2.out",
      }, effect.delays.beforeFirstShow + index * effect.delays.betweenShows).to(particle, {
        autoAlpha: 0,
        duration: effect.duration * 0.76,
        ease: "power2.out",
        rotation: 160,
        scale: 0.8,
        x,
        y,
      }, effect.delays.beforeFirstShow + effect.duration * 0.24 + index * effect.delays.betweenShows);
    });
  }

  private resetSequence(): void {
    this.timeline?.kill();
    this.timeline = null;
    const animatedElements = [
      this.card,
      this.message,
      this.points,
      ...Array.from(this.stars.children),
      this.nextLevelButton,
      this.shuffleButton,
      this.canvasHost,
      this.wave,
      this.pointsRing,
      ...Array.from(this.card.querySelectorAll(".win-burst i")),
    ].filter((element): element is Element => element !== null);
    gsap.set(animatedElements, { clearProps: "all" });
  }

  private loadNextLevel = () => this.actions.onNextLevel?.();
  private shuffleAgain = () => this.actions.onShuffle?.();

  destroy(): void {
    this.resetSequence();
    this.nextLevelButton?.removeEventListener("click", this.loadNextLevel);
    this.shuffleButton?.removeEventListener("click", this.shuffleAgain);
    this.wave?.remove();
  }
}
