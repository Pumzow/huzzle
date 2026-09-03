import { gameConfig } from "../config/gameConfig";

export function applyVisualEffectVariables(element: HTMLElement): void {
  const effects = gameConfig.visualEffects;
  const completion = effects.completion;
  const scene = effects.sceneTransition;
  const panel = effects.panel;
  const leaderboard = effects.leaderboard;
  const points = effects.pointsReward;
  const buttons = effects.buttonFeedback;
  const background = effects.backgroundReaction;

  element.style.setProperty("--completion-wave-duration", `${completion.waveDurationMs}ms`);
  element.style.setProperty("--completion-wave-scale", String(completion.waveScale));
  element.style.setProperty("--completion-impact-scale", String(completion.boardImpactScale));
  element.style.setProperty("--completion-impact-brightness", String(completion.boardImpactBrightness));
  element.style.setProperty("--completion-modal-delay", `${completion.modalDelayMs}ms`);
  element.style.setProperty("--completion-star-duration", `${completion.starDurationMs}ms`);
  element.style.setProperty("--completion-star-peak-scale", String(completion.starPeakScale));
  element.style.setProperty("--completion-message-duration", `${completion.messageDurationMs}ms`);
  element.style.setProperty("--completion-actions-duration", `${completion.actionsDurationMs}ms`);
  element.style.setProperty("--completion-particle-duration", `${completion.particleDurationMs}ms`);
  element.style.setProperty("--completion-particle-scale", String(completion.particleScale));
  element.style.setProperty("--completion-particle-size", `${completion.particleSizePx}px`);
  element.style.setProperty("--scene-transition-duration", `${scene.durationMs}ms`);
  element.style.setProperty("--scene-transition-offset", `${scene.offsetPx}px`);
  element.style.setProperty("--scene-transition-exit-offset", `${scene.offsetPx * -0.6}px`);
  element.style.setProperty("--scene-transition-scale", String(scene.initialScale));
  element.style.setProperty("--scene-transition-blur", `${scene.blurPx}px`);
  element.style.setProperty("--panel-transition-duration", `${panel.durationMs}ms`);
  element.style.setProperty("--panel-transition-scale", String(panel.initialScale));
  element.style.setProperty("--panel-transition-offset", `${panel.offsetPx}px`);
  element.style.setProperty("--leaderboard-row-duration", `${leaderboard.rowDurationMs}ms`);
  element.style.setProperty("--leaderboard-sweep-duration", `${leaderboard.currentPlayerSweepMs}ms`);
  element.style.setProperty("--points-impact-duration", `${points.impactDurationMs}ms`);
  element.style.setProperty("--points-impact-scale", String(points.peakScale));
  element.style.setProperty("--button-press-duration", `${buttons.pressDurationMs}ms`);
  element.style.setProperty("--button-press-scale", String(buttons.pressScale));
  element.style.setProperty("--button-ripple-duration", `${buttons.rippleDurationMs}ms`);
  element.style.setProperty("--button-ripple-scale", String(buttons.rippleScale));
  element.style.setProperty("--button-ripple-opacity", String(buttons.rippleOpacity));
  const ambientStyle = document.documentElement.style;
  ambientStyle.setProperty("--ambient-scene-duration", `${background.sceneDurationMs}ms`);
  ambientStyle.setProperty("--ambient-completion-duration", `${background.completionDurationMs}ms`);
  ambientStyle.setProperty("--ambient-completion-scale", String(background.completionScale));
  ambientStyle.setProperty("--ambient-completion-saturation", String(background.completionSaturation));
}

type BackgroundReaction = "scene" | "completion";
let backgroundReactionTimer: number | null = null;

export function triggerBackgroundReaction(reaction: BackgroundReaction): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const body = document.body;
  body.classList.remove("ambient-scene-reaction", "ambient-completion-reaction");
  void body.offsetWidth;
  body.classList.add(`ambient-${reaction}-reaction`);
  if (backgroundReactionTimer !== null) window.clearTimeout(backgroundReactionTimer);
  const config = gameConfig.visualEffects.backgroundReaction;
  const duration = reaction === "completion" ? config.completionDurationMs : config.sceneDurationMs;
  backgroundReactionTimer = window.setTimeout(() => {
    body.classList.remove(`ambient-${reaction}-reaction`);
    backgroundReactionTimer = null;
  }, duration);
}

export class InteractionEffects {
  constructor(private readonly root: HTMLElement) {
    root.addEventListener("pointerdown", this.handlePointerDown);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>("button:not(:disabled), .menu-action, .upload-button")
      : null;
    if (!target || !this.root.contains(target)) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    target.style.setProperty("--control-ripple-size", `${size}px`);
    target.style.setProperty("--control-ripple-x", `${event.clientX - rect.left - size / 2}px`);
    target.style.setProperty("--control-ripple-y", `${event.clientY - rect.top - size / 2}px`);
    target.classList.remove("is-rippling", "is-pressing");
    void target.offsetWidth;
    target.classList.add("has-control-effect", "is-rippling", "is-pressing");

    const cleanup = () => {
      target.classList.remove("has-control-effect", "is-rippling", "is-pressing");
    };
    window.setTimeout(cleanup, gameConfig.visualEffects.buttonFeedback.rippleDurationMs + 50);
  };

  destroy(): void {
    this.root.removeEventListener("pointerdown", this.handlePointerDown);
  }
}
