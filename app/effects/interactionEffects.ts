import { gsap } from "gsap";
import { gameConfig } from "../config/gameConfig";
import { prefersReducedMotion } from "./reducedMotion";

export class InteractionEffects {
  constructor(private readonly root: HTMLElement) {
    root.addEventListener("pointerdown", this.handlePointerDown);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (prefersReducedMotion()) return;
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(
            "button:not(:disabled), .menu-action, .upload-button",
          )
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
    gsap.fromTo(
      ripple,
      { autoAlpha: config.rippleOpacity, scale: 0 },
      {
        autoAlpha: 0,
        duration: config.rippleDuration,
        ease: "power2.out",
        onComplete: () => ripple.remove(),
        scale: config.rippleScale,
      },
    );
    gsap.fromTo(
      target,
      { scale: 1 },
      {
        clearProps: "transform",
        duration: config.pressDuration / 2,
        ease: "power2.out",
        overwrite: "auto",
        repeat: 1,
        scale: config.pressScale,
        yoyo: true,
      },
    );
  };

  destroy(): void {
    this.root.removeEventListener("pointerdown", this.handlePointerDown);
    gsap.killTweensOf(this.root.querySelectorAll(".control-ripple"));
    this.root
      .querySelectorAll(".control-ripple")
      .forEach((ripple) => ripple.remove());
  }
}
