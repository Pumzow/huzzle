import { gsap } from "gsap";
import { gameConfig } from "../../config/gameConfig";

export class CompletionEffects {
  readonly wave: HTMLElement | null;

  constructor(
    private readonly card: HTMLElement,
    private readonly stars: HTMLElement,
    boardWrap: HTMLElement | null,
    private readonly canvasHost: HTMLElement | null,
  ) {
    this.wave = boardWrap ? document.createElement("i") : null;
    if (this.wave) {
      this.wave.className = "completion-wave";
      this.wave.setAttribute("aria-hidden", "true");
      boardWrap!.append(this.wave);
    }
  }

  addTo(timeline: gsap.core.Timeline, earnedStars: number): void {
    this.addBoardEffects(timeline);
    this.addParticleEffects(timeline);
    this.addStarEffects(timeline, earnedStars);
  }

  animatedElements(): Element[] {
    return [
      this.canvasHost,
      this.wave,
      ...Array.from(this.card.querySelectorAll(".win-burst i")),
    ].filter((element): element is Element => element !== null);
  }

  destroy(): void {
    this.wave?.remove();
  }

  private addBoardEffects(timeline: gsap.core.Timeline): void {
    const effect = gameConfig.visualEffects.completion.wave;
    if (this.wave) {
      timeline
        .fromTo(
          this.wave,
          { autoAlpha: 0, scale: 0.94 },
          {
            autoAlpha: 1,
            duration: effect.duration * 0.34,
            ease: "power2.out",
          },
          effect.delayBeforeStart,
        )
        .to(
          this.wave,
          {
            autoAlpha: 0,
            duration: effect.duration * 0.66,
            ease: "power2.inOut",
            scale: effect.scale,
          },
          effect.delayBeforeStart + effect.duration * 0.34,
        );
    }
    if (this.canvasHost) {
      timeline
        .to(
          this.canvasHost,
          {
            duration: effect.duration * 0.24,
            ease: "power2.out",
            filter: `brightness(${effect.boardImpactBrightness})`,
            scale: effect.boardImpactScale,
          },
          effect.delayBeforeStart,
        )
        .to(
          this.canvasHost,
          {
            duration: effect.duration * 0.76,
            ease: "elastic.out(1,.55)",
            filter: "brightness(1)",
            scale: 1,
          },
          effect.delayBeforeStart + effect.duration * 0.24,
        );
    }
  }

  private addParticleEffects(timeline: gsap.core.Timeline): void {
    const effect = gameConfig.visualEffects.completion.particles;
    const particles = Array.from(
      this.card.querySelectorAll<HTMLElement>(".win-burst i"),
    );
    const burst = this.card.querySelector<HTMLElement>(".win-burst");
    if (burst) gsap.set(burst, { scale: effect.scale });
    particles.forEach((particle, index) => {
      gsap.set(particle, { height: effect.sizePx, width: effect.sizePx });
      const style = getComputedStyle(particle);
      const x = style.getPropertyValue("--burst-x").trim();
      const y = style.getPropertyValue("--burst-y").trim();
      const start =
        effect.delays.beforeFirstShow + index * effect.delays.betweenShows;
      timeline
        .fromTo(
          particle,
          {
            autoAlpha: 0,
            rotation: 0,
            scale: 0.2,
            xPercent: -50,
            yPercent: -50,
          },
          {
            autoAlpha: 1,
            duration: effect.duration * 0.24,
            ease: "power2.out",
          },
          start,
        )
        .to(
          particle,
          {
            autoAlpha: 0,
            duration: effect.duration * 0.76,
            ease: "power2.out",
            rotation: 160,
            scale: 0.8,
            x,
            y,
          },
          start + effect.duration * 0.24,
        );
    });
  }

  private addStarEffects(
    timeline: gsap.core.Timeline,
    earnedStars: number,
  ): void {
    const effect = gameConfig.visualEffects.completion.stars;
    const stars = Array.from(
      this.stars.querySelectorAll<HTMLElement>(".is-earned"),
    );
    stars.slice(0, earnedStars).forEach((star, index) => {
      const start =
        effect.delays.beforeFirstShow + index * effect.delays.betweenShows;
      const peakDuration = effect.duration * 0.65;
      timeline.to(
        star,
        {
          autoAlpha: 1,
          duration: peakDuration,
          ease: "power2.out",
          filter: "brightness(1.35)",
          rotation: 8,
          scale: effect.peakScale,
          y: -3,
        },
        start,
      );
      timeline.to(
        star,
        {
          duration: effect.duration - peakDuration,
          ease: "power2.inOut",
          filter: "brightness(1)",
          rotation: 0,
          scale: 1,
          y: 0,
        },
        start + peakDuration,
      );
    });
  }
}
