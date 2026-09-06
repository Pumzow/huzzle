import { gsap } from "gsap";
import { gameConfig } from "../../config/gameConfig";
import { bangUp } from "../bangUp";
import { prefersReducedMotion } from "../reducedMotion";
import { CompletionEffects } from "./completionEffects";
import { completionPointsMessage } from "../../presenters/puzzleCompletion";

type CompletionSequenceElements = {
  card: HTMLElement;
  stars: HTMLElement;
  message: HTMLElement;
  points: HTMLElement;
  pointsValue: HTMLElement;
  pointsRing: HTMLElement;
  boardWrap: HTMLElement | null;
  canvasHost: HTMLElement | null;
  actionButtons: HTMLButtonElement[];
};

export class CompletionSequence {
  private readonly effects: CompletionEffects;
  private timeline: gsap.core.Timeline | null = null;

  constructor(private readonly elements: CompletionSequenceElements) {
    this.effects = new CompletionEffects(
      elements.card,
      elements.stars,
      elements.boardWrap,
      elements.canvasHost,
    );
  }

  play(earnedStars: number, pointsAwarded: number, isCheater: boolean): void {
    this.reset();
    const {
      card,
      stars,
      message,
      points,
      pointsValue,
      actionButtons,
    } = this.elements;
    const completion = gameConfig.visualEffects.completion;
    const earnedStarElements = Array.from(
      stars.querySelectorAll<HTMLElement>(".is-earned"),
    );

    if (prefersReducedMotion()) {
      pointsValue.textContent = completionPointsMessage(
        pointsAwarded,
        isCheater,
      );
      return;
    }

    gsap.set(card, { autoAlpha: 0, xPercent: -50, y: 14 });
    gsap.set(earnedStarElements, {
      autoAlpha: 0,
      filter: "brightness(1.8)",
      rotation: -28,
      scale: 0.05,
      y: 12,
    });
    gsap.set(message, {
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
    if (!points.hidden) {
      gsap.set(points, { autoAlpha: 0, scale: 0.72, y: 8 });
    }
    if (pointsAwarded > 0 && !isCheater) {
      pointsValue.textContent = completionPointsMessage(0, false);
    }

    const timeline = gsap.timeline();
    this.timeline = timeline;
    this.effects.addTo(timeline, earnedStars);
    timeline.to(
      card,
      {
        autoAlpha: 1,
        duration: completion.modal.duration,
        ease: "power2.out",
        xPercent: -50,
        y: 0,
      },
      completion.modal.delayBeforeShow,
    );

    timeline.to(
      message,
      {
        autoAlpha: 1,
        duration: completion.message.duration,
        ease: "back.out(1.7)",
        filter: "blur(0px)",
        scale: 1,
        y: 0,
      },
      completion.message.delayBeforeShow,
    );

    if (!points.hidden) {
      this.addPoints(timeline, pointsAwarded, isCheater);
    }
    const actionsDelay = points.hidden
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
      actionsDelay,
    );
  }

  reset(): void {
    this.timeline?.kill();
    this.timeline = null;
    const { card, message, points, stars, pointsRing, actionButtons } =
      this.elements;
    gsap.set(
      [
        card,
        message,
        points,
        ...Array.from(stars.children),
        ...actionButtons,
        pointsRing,
        ...this.effects.animatedElements(),
      ],
      { clearProps: "all" },
    );
  }

  destroy(): void {
    this.reset();
    this.effects.destroy();
  }

  private addPoints(
    timeline: gsap.core.Timeline,
    pointsAwarded: number,
    isCheater: boolean,
  ): void {
    const { points, pointsValue, pointsRing } = this.elements;
    const effect = gameConfig.visualEffects.completion.points;
    if (pointsAwarded > 0 && !isCheater) {
      const counter = { value: 0 };
      timeline.to(
        points,
        {
          autoAlpha: 1,
          duration: effect.countDuration,
          ease: "power3.out",
          scale: 1,
          y: 0,
        },
        effect.delayBeforeShow,
      );
      timeline.to(
        counter,
        {
          duration: effect.countDuration,
          ease: "power3.out",
          onUpdate: () => {
            pointsValue.textContent = completionPointsMessage(
              Math.round(counter.value),
              false,
            );
          },
          value: pointsAwarded,
        },
        effect.delayBeforeShow,
      );
      bangUp(points, {
        at: effect.delayBeforeShow + effect.countDuration,
        duration: effect.impactDuration,
        peakScale: effect.peakScale,
        ring: pointsRing,
        timeline,
      });
      return;
    }
    timeline.to(
      points,
      {
        autoAlpha: 1,
        duration: effect.impactDuration,
        ease: "back.out(1.7)",
        scale: 1,
        y: 0,
      },
      effect.delayBeforeShow,
    );
  }
}
