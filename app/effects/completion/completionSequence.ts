import { gsap } from "gsap";
import { gameConfig } from "../../config/gameConfig";
import { bangUp } from "../bangUp";
import { prefersReducedMotion } from "../reducedMotion";
import { CompletionEffects } from "./completionEffects";

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
  private pointsBangTimeline: gsap.core.Timeline | null = null;

  constructor(
    private readonly elements: CompletionSequenceElements,
    private readonly onStarShown: (starNumber: number) => void = () => undefined,
  ) {
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
      pointsValue.textContent = isCheater
        ? "No points for cheaters"
        : pointsAwarded > 0
          ? `+${pointsAwarded} points`
          : "";
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
      pointsValue.textContent = "+0 points";
    }

    const timeline = gsap.timeline();
    this.timeline = timeline;
    this.effects.addTo(timeline, earnedStars, this.onStarShown);
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
    this.pointsBangTimeline?.kill();
    this.pointsBangTimeline = null;
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
      timeline.call(
        () => {
          this.pointsBangTimeline?.kill();
          const counter = { value: 0 };
          this.pointsBangTimeline = bangUp({
            duration: effect.countDuration,
            eventSource: "completion-points",
            target: counter,
            to: pointsAwarded,
            tween: {
              ease: "power3.out",
              onUpdate: () => {
                pointsValue.textContent = `+${counter.value} points`;
              },
              snap: { value: 1 },
            },
          });
        },
        [],
        effect.delayBeforeShow,
      );
      const impactStart = effect.delayBeforeShow + effect.countDuration;
      const peakDuration = effect.impactDuration * 0.28;
      timeline.to(
        points,
        {
          duration: peakDuration,
          ease: "power2.out",
          filter: "brightness(1.8) drop-shadow(0 0 12px rgba(239,106,59,.55))",
          rotation: -3,
          scale: effect.peakScale,
        },
        impactStart,
      );
      timeline.to(
        points,
        {
          duration: effect.impactDuration - peakDuration,
          ease: "elastic.out(1,.45)",
          filter: "brightness(1)",
          rotation: 0,
          scale: 1,
        },
        ">",
      );
      timeline.fromTo(
        pointsRing,
        { autoAlpha: 0.7, scale: 0.65 },
        {
          autoAlpha: 0,
          duration: effect.impactDuration,
          ease: "power2.out",
          scale: 1.7,
        },
        impactStart,
      );
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
