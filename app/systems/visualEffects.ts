import { gsap } from "gsap";
import { gameConfig } from "../config/gameConfig";

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function animateSceneEntrance(element: HTMLElement | null): void {
  if (!element || prefersReducedMotion()) return;
  const config = gameConfig.visualEffects.sceneTransition;
  gsap.fromTo(
    element,
    { autoAlpha: 0, filter: `blur(${config.blurPx}px)`, scale: config.initialScale, y: config.offsetPx },
    { autoAlpha: 1, duration: config.duration, ease: "power2.out", filter: "blur(0px)", scale: 1, y: 0, clearProps: "all" },
  );
}

export function animateSceneExit(element: Element): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  const config = gameConfig.visualEffects.sceneTransition;
  return new Promise((resolve) => {
    gsap.to(element, {
      autoAlpha: 0,
      duration: config.duration,
      ease: "power2.in",
      filter: `blur(${config.blurPx}px)`,
      scale: 0.985,
      y: config.offsetPx * -0.6,
      onComplete: resolve,
      overwrite: true,
    });
  });
}

const dialogTimelines = new WeakMap<HTMLDialogElement, gsap.core.Timeline>();

export function showAnimatedDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  dialog.showModal();
  if (prefersReducedMotion()) return;
  dialogTimelines.get(dialog)?.kill();
  const card = dialog.querySelector<HTMLElement>(".panel-dialog-card, .puzzle-settings-card");
  const config = gameConfig.visualEffects.panel;
  const timeline = gsap.timeline();
  dialogTimelines.set(dialog, timeline);
  timeline.fromTo(dialog, { autoAlpha: 0 }, { autoAlpha: 1, duration: config.duration * 0.55, ease: "power2.out" }, 0);
  if (card) {
    timeline.fromTo(
      card,
      { autoAlpha: 0, scale: config.initialScale, y: config.offsetPx },
      { autoAlpha: 1, duration: config.duration, ease: "back.out(1.35)", scale: 1, y: 0 },
      0,
    );
  }
}

export function closeAnimatedDialog(dialog: HTMLDialogElement, onClosed?: () => void): void {
  if (!dialog.open) return;
  dialogTimelines.get(dialog)?.kill();
  if (prefersReducedMotion()) {
    dialog.close();
    onClosed?.();
    return;
  }
  const card = dialog.querySelector<HTMLElement>(".panel-dialog-card, .puzzle-settings-card");
  const duration = gameConfig.visualEffects.panel.duration * 0.55;
  const timeline = gsap.timeline({
    onComplete: () => {
      dialog.close();
      gsap.set([dialog, card].filter(Boolean), { clearProps: "all" });
      dialogTimelines.delete(dialog);
      onClosed?.();
    },
  });
  dialogTimelines.set(dialog, timeline);
  if (card) timeline.to(card, { autoAlpha: 0, duration, ease: "power2.in", scale: 0.96, y: 10 }, 0);
  timeline.to(dialog, { autoAlpha: 0, duration, ease: "power2.in" }, 0);
}

export function animateLeaderboardRows(rows: HTMLElement[]): void {
  if (prefersReducedMotion()) return;
  const config = gameConfig.visualEffects.leaderboard;
  rows.forEach((row, index) => {
    const delay = Math.min(index, config.maximumStaggeredRows) * config.rowStagger;
    gsap.fromTo(row, { autoAlpha: 0, scale: 0.985, x: 22 }, {
      autoAlpha: 1,
      duration: config.rowDuration,
      delay,
      ease: "power2.out",
      scale: 1,
      x: 0,
      clearProps: "opacity,visibility,transform",
    });
  });
  rows.forEach((row, index) => {
    if (!row.classList.contains("is-current")) return;
    const sweep = row.querySelector<HTMLElement>(".leaderboard-sweep");
    if (!sweep) return;
    gsap.fromTo(
      sweep,
      { xPercent: -130 },
      { duration: config.currentPlayerSweep, ease: "power2.out", xPercent: 130, delay: 0.18 + Math.min(index, config.maximumStaggeredRows) * config.rowStagger },
    );
  });
}

export function animateMenuPoints(element: HTMLElement): void {
  if (prefersReducedMotion()) return;
  gsap.fromTo(
    element,
    { autoAlpha: 0, rotation: -10, scale: 0.45, y: 10 },
    { autoAlpha: 1, duration: gameConfig.visualEffects.mainMenu.pointsDuration, ease: "back.out(1.7)", rotation: 0, scale: 1, y: 0 },
  );
}

export function createSceneMotion(root: HTMLElement, type: "intro" | "menu"): gsap.Context {
  return gsap.context(() => {
    if (prefersReducedMotion()) return;
    if (type === "intro") {
      const config = gameConfig.visualEffects.intro;
      gsap.from(".intro-center", { autoAlpha: 0, duration: config.entranceDuration, ease: "power2.out", scale: 0.96, y: 18 });
      gsap.to(".intro-prompt", { autoAlpha: 0.58, duration: config.promptDuration / 2, ease: "sine.inOut", repeat: -1, y: 2, yoyo: true });
      gsap.to(".intro-figure", { duration: config.figureDuration / 2, ease: "sine.inOut", repeat: -1, rotation: 14, scale: 1.12, x: "-13vw", y: "-9vh", yoyo: true });
      gsap.to(".intro-scene", { backgroundPosition: "8% 4%, 92% 88%, 0 0", duration: config.ambientDuration / 2, ease: "sine.inOut", repeat: -1, yoyo: true });
      return;
    }
    const config = gameConfig.visualEffects.mainMenu;
    gsap.from(".menu-card", { autoAlpha: 0, duration: config.entranceDuration, ease: "power2.out", y: 14 });
    gsap.to(".menu-decoration-one", { duration: config.firstDecorationDuration / 2, ease: "sine.inOut", repeat: -1, rotation: 22, scale: 1.08, x: "12vw", y: "10vh", yoyo: true });
    gsap.to(".menu-decoration-two", { duration: config.secondDecorationDuration / 2, ease: "sine.inOut", repeat: -1, rotation: -18, scale: 0.92, x: "-10vw", y: "-12vh", yoyo: true });
  }, root);
}

class AmbientEffects {
  private readonly layer: HTMLElement;
  private readonly blobs: HTMLElement[];
  private readonly context: gsap.Context;
  private reaction: gsap.core.Timeline | null = null;

  constructor() {
    this.layer = document.createElement("div");
    this.layer.className = "ambient-effects";
    this.layer.setAttribute("aria-hidden", "true");
    this.layer.innerHTML = '<i class="ambient-blob ambient-blob-one"><b></b></i><i class="ambient-blob ambient-blob-two"><b></b></i>';
    document.body.prepend(this.layer);
    this.blobs = Array.from(this.layer.querySelectorAll<HTMLElement>(".ambient-blob"));
    this.context = gsap.context(() => {
      const config = gameConfig.visualEffects.backgroundReaction;
      gsap.set(this.blobs.map((blob) => blob.firstElementChild), {
        filter: `blur(${config.blurPx}px) saturate(1) brightness(1)`,
      });
      if (prefersReducedMotion()) return;
      gsap.to(this.blobs[0], { duration: config.firstDriftDuration / 2, ease: "sine.inOut", repeat: -1, rotation: 12, scale: 1.12, x: "9vw", y: "8vh", yoyo: true });
      gsap.to(this.blobs[1], { duration: config.secondDriftDuration / 2, ease: "sine.inOut", repeat: -1, rotation: -11, scale: 1.08, x: "-10vw", y: "-7vh", yoyo: true });
    }, this.layer);
  }

  react(type: "scene" | "completion"): void {
    if (prefersReducedMotion()) return;
    this.reaction?.kill();
    const config = gameConfig.visualEffects.backgroundReaction;
    const duration = type === "completion" ? config.completionDuration : config.sceneDuration;
    const scale = type === "completion" ? config.completionScale : 1.1;
    const saturation = type === "completion" ? config.completionSaturation : 1.3;
    const reactionBlur = type === "completion"
      ? config.completionReactionBlurPx
      : config.sceneReactionBlurPx;
    const inners = this.blobs.map((blob) => blob.firstElementChild as HTMLElement);
    this.reaction = gsap.timeline().to(inners, {
      duration: duration * 0.36,
      ease: "power2.out",
      filter: `blur(${reactionBlur}px) saturate(${saturation}) brightness(1.2)`,
      scale,
      stagger: 0.03,
    }).to(inners, {
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

export function triggerBackgroundReaction(reaction: "scene" | "completion"): void {
  ambientEffects?.react(reaction);
}

export class InteractionEffects {
  constructor(private readonly root: HTMLElement) {
    root.addEventListener("pointerdown", this.handlePointerDown);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (prefersReducedMotion()) return;
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>("button:not(:disabled), .menu-action, .upload-button")
      : null;
    if (!target || !this.root.contains(target)) return;
    const config = gameConfig.visualEffects.buttonFeedback;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("i");
    ripple.className = "control-ripple";
    Object.assign(ripple.style, {
      height: `${size}px`,
      left: `${event.clientX - rect.left - size / 2}px`,
      top: `${event.clientY - rect.top - size / 2}px`,
      width: `${size}px`,
    });
    target.classList.add("has-control-effect");
    target.append(ripple);
    gsap.fromTo(ripple, { autoAlpha: config.rippleOpacity, scale: 0 }, {
      autoAlpha: 0,
      duration: config.rippleDuration,
      ease: "power2.out",
      scale: config.rippleScale,
      onComplete: () => ripple.remove(),
    });
    gsap.fromTo(target, { scale: 1 }, {
      duration: config.pressDuration / 2,
      ease: "power2.out",
      repeat: 1,
      scale: config.pressScale,
      yoyo: true,
      clearProps: "transform",
      overwrite: "auto",
    });
  };

  destroy(): void {
    this.root.removeEventListener("pointerdown", this.handlePointerDown);
    gsap.killTweensOf(this.root.querySelectorAll(".control-ripple"));
    this.root.querySelectorAll(".control-ripple").forEach((ripple) => ripple.remove());
  }
}
