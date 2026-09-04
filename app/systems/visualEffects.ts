import { gameConfig } from "../config/gameConfig";
import { Utils } from "../utils/utils";

export function applyVisualEffectVariables(element: HTMLElement): void {
  const effects = gameConfig.visualEffects;
  const completion = effects.completion;
  const scene = effects.sceneTransition;
  const panel = effects.panel;
  const leaderboard = effects.leaderboard;
  const points = completion.points;
  const buttons = effects.buttonFeedback;
  const background = effects.backgroundReaction;

  element.style.setProperty(
    "--completion-wave-delay",
    Utils.toCssSeconds(completion.wave.delayBeforeStart)
  );
  element.style.setProperty(
    "--completion-wave-duration",
    Utils.toCssSeconds(completion.wave.duration)
  );
  element.style.setProperty(
    "--completion-wave-scale",
    String(completion.wave.scale)
  );
  element.style.setProperty(
    "--completion-impact-scale",
    String(completion.wave.boardImpactScale)
  );
  element.style.setProperty(
    "--completion-impact-brightness",
    String(completion.wave.boardImpactBrightness)
  );
  element.style.setProperty(
    "--completion-particle-delay",
    Utils.toCssSeconds(completion.particles.delayBeforeShow)
  );
  element.style.setProperty(
    "--completion-particle-duration",
    Utils.toCssSeconds(completion.particles.duration)
  );
  element.style.setProperty(
    "--completion-particle-scale",
    String(completion.particles.scale)
  );
  element.style.setProperty(
    "--completion-particle-size",
    `${completion.particles.sizePx}px`
  );
  element.style.setProperty(
    "--scene-transition-duration",
    Utils.toCssSeconds(scene.duration)
  );
  element.style.setProperty("--scene-transition-offset", `${scene.offsetPx}px`);
  element.style.setProperty(
    "--scene-transition-exit-offset",
    `${scene.offsetPx * -0.6}px`
  );
  element.style.setProperty(
    "--scene-transition-scale",
    String(scene.initialScale)
  );
  element.style.setProperty("--scene-transition-blur", `${scene.blurPx}px`);
  element.style.setProperty(
    "--panel-transition-duration",
    Utils.toCssSeconds(panel.duration)
  );
  element.style.setProperty(
    "--panel-transition-scale",
    String(panel.initialScale)
  );
  element.style.setProperty("--panel-transition-offset", `${panel.offsetPx}px`);
  element.style.setProperty(
    "--leaderboard-row-duration",
    Utils.toCssSeconds(leaderboard.rowDuration)
  );
  element.style.setProperty(
    "--leaderboard-sweep-duration",
    Utils.toCssSeconds(leaderboard.currentPlayerSweep)
  );
  element.style.setProperty(
    "--points-impact-duration",
    Utils.toCssSeconds(points.impactDuration)
  );
  element.style.setProperty("--points-impact-scale", String(points.peakScale));
  element.style.setProperty(
    "--button-press-duration",
    Utils.toCssSeconds(buttons.pressDuration)
  );
  element.style.setProperty("--button-press-scale", String(buttons.pressScale));
  element.style.setProperty(
    "--button-ripple-duration",
    Utils.toCssSeconds(buttons.rippleDuration)
  );
  element.style.setProperty(
    "--button-ripple-scale",
    String(buttons.rippleScale)
  );
  element.style.setProperty(
    "--button-ripple-opacity",
    String(buttons.rippleOpacity)
  );
  const ambientStyle = document.documentElement.style;
  ambientStyle.setProperty(
    "--ambient-scene-duration",
    Utils.toCssSeconds(background.sceneDuration)
  );
  ambientStyle.setProperty(
    "--ambient-completion-duration",
    Utils.toCssSeconds(background.completionDuration)
  );
  ambientStyle.setProperty(
    "--ambient-completion-scale",
    String(background.completionScale)
  );
  ambientStyle.setProperty(
    "--ambient-completion-saturation",
    String(background.completionSaturation)
  );
}

type BackgroundReaction = "scene" | "completion";
let backgroundReactionTimer: number | null = null;

export function triggerBackgroundReaction(reaction: BackgroundReaction): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const body = document.body;
  body.classList.remove(
    "ambient-scene-reaction",
    "ambient-completion-reaction"
  );
  void body.offsetWidth;
  body.classList.add(`ambient-${reaction}-reaction`);
  if (backgroundReactionTimer !== null)
    window.clearTimeout(backgroundReactionTimer);
  const config = gameConfig.visualEffects.backgroundReaction;
  const duration =
    reaction === "completion"
      ? config.completionDuration
      : config.sceneDuration;
  backgroundReactionTimer = window.setTimeout(() => {
    body.classList.remove(`ambient-${reaction}-reaction`);
    backgroundReactionTimer = null;
  }, Utils.toMilliseconds(duration));
}

export class InteractionEffects {
  constructor(private readonly root: HTMLElement) {
    root.addEventListener("pointerdown", this.handlePointerDown);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(
            "button:not(:disabled), .menu-action, .upload-button"
          )
        : null;
    if (!target || !this.root.contains(target)) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    target.style.setProperty("--control-ripple-size", `${size}px`);
    target.style.setProperty(
      "--control-ripple-x",
      `${event.clientX - rect.left - size / 2}px`
    );
    target.style.setProperty(
      "--control-ripple-y",
      `${event.clientY - rect.top - size / 2}px`
    );
    target.classList.remove("is-rippling", "is-pressing");
    void target.offsetWidth;
    target.classList.add("has-control-effect", "is-rippling", "is-pressing");

    const cleanup = () => {
      target.classList.remove(
        "has-control-effect",
        "is-rippling",
        "is-pressing"
      );
    };
    window.setTimeout(
      cleanup,
      Utils.toMilliseconds(
        gameConfig.visualEffects.buttonFeedback.rippleDuration + 0.05
      )
    );
  };

  destroy(): void {
    this.root.removeEventListener("pointerdown", this.handlePointerDown);
  }
}
