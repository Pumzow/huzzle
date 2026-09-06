import { gsap } from "gsap";
import { gameConfig } from "../config/gameConfig";
import { prefersReducedMotion } from "./reducedMotion";

export type BackgroundReaction = "scene" | "completion";

class AmbientEffects {
  private readonly layer: HTMLElement;
  private readonly blobs: HTMLElement[];
  private readonly context: gsap.Context;
  private reaction: gsap.core.Timeline | null = null;

  constructor() {
    this.layer = document.createElement("div");
    this.layer.className = "ambient-effects";
    this.layer.setAttribute("aria-hidden", "true");
    this.layer.innerHTML =
      '<i class="ambient-blob ambient-blob-one"><b></b></i><i class="ambient-blob ambient-blob-two"><b></b></i>';
    document.body.prepend(this.layer);
    this.blobs = Array.from(
      this.layer.querySelectorAll<HTMLElement>(".ambient-blob"),
    );
    this.context = gsap.context(() => {
      const config = gameConfig.visualEffects.backgroundReaction;
      gsap.set(
        this.blobs.map((blob) => blob.firstElementChild),
        { filter: `blur(${config.blurPx}px) saturate(1) brightness(1)` },
      );
      if (prefersReducedMotion()) return;
      gsap.to(this.blobs[0], {
        duration: config.firstDriftDuration / 2,
        ease: "sine.inOut",
        repeat: -1,
        rotation: 12,
        scale: 1.12,
        x: "9vw",
        y: "8vh",
        yoyo: true,
      });
      gsap.to(this.blobs[1], {
        duration: config.secondDriftDuration / 2,
        ease: "sine.inOut",
        repeat: -1,
        rotation: -11,
        scale: 1.08,
        x: "-10vw",
        y: "-7vh",
        yoyo: true,
      });
    }, this.layer);
  }

  react(type: BackgroundReaction): void {
    if (prefersReducedMotion()) return;
    this.reaction?.kill();
    const config = gameConfig.visualEffects.backgroundReaction;
    const duration =
      type === "completion" ? config.completionDuration : config.sceneDuration;
    const scale = type === "completion" ? config.completionScale : 1.1;
    const saturation =
      type === "completion" ? config.completionSaturation : 1.3;
    const reactionBlur =
      type === "completion"
        ? config.completionReactionBlurPx
        : config.sceneReactionBlurPx;
    const inners = this.blobs.map(
      (blob) => blob.firstElementChild as HTMLElement,
    );
    this.reaction = gsap
      .timeline()
      .to(inners, {
        duration: duration * 0.36,
        ease: "power2.out",
        filter: `blur(${reactionBlur}px) saturate(${saturation}) brightness(1.2)`,
        scale,
        stagger: 0.03,
      })
      .to(inners, {
        duration: duration * 0.64,
        ease: "power2.inOut",
        filter: `blur(${config.blurPx}px) saturate(1) brightness(1)`,
        scale: 1,
      });
  }

  destroy(): void {
    this.reaction?.kill();
    this.context.revert();
    this.layer.remove();
  }
}

let ambientEffects: AmbientEffects | null = null;

export function initializeVisualEffects(): () => void {
  ambientEffects?.destroy();
  ambientEffects = new AmbientEffects();
  return () => {
    ambientEffects?.destroy();
    ambientEffects = null;
  };
}

export function triggerBackgroundReaction(reaction: BackgroundReaction): void {
  ambientEffects?.react(reaction);
}
