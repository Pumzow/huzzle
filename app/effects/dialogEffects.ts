import { gsap } from "gsap";
import { gameConfig } from "../config/gameConfig";
import { prefersReducedMotion } from "./reducedMotion";

const dialogTimelines = new WeakMap<HTMLDialogElement, gsap.core.Timeline>();

export function showAnimatedDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  dialog.showModal();
  if (prefersReducedMotion()) return;
  dialogTimelines.get(dialog)?.kill();
  const card = dialog.querySelector<HTMLElement>(
    ".panel-dialog-card, .puzzle-settings-card",
  );
  const config = gameConfig.visualEffects.panel;
  const timeline = gsap.timeline();
  dialogTimelines.set(dialog, timeline);
  timeline.fromTo(
    dialog,
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      duration: config.duration * 0.55,
      ease: "power2.out",
    },
    0,
  );
  if (card) {
    timeline.fromTo(
      card,
      { autoAlpha: 0, scale: config.initialScale, y: config.offsetPx },
      {
        autoAlpha: 1,
        duration: config.duration,
        ease: "back.out(1.35)",
        scale: 1,
        y: 0,
      },
      0,
    );
  }
}

export function closeAnimatedDialog(
  dialog: HTMLDialogElement,
  onClosed?: () => void,
): void {
  if (!dialog.open) return;
  dialogTimelines.get(dialog)?.kill();
  if (prefersReducedMotion()) {
    dialog.close();
    onClosed?.();
    return;
  }
  const card = dialog.querySelector<HTMLElement>(
    ".panel-dialog-card, .puzzle-settings-card",
  );
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
  if (card) {
    timeline.to(
      card,
      {
        autoAlpha: 0,
        duration,
        ease: "power2.in",
        scale: 0.96,
        y: 10,
      },
      0,
    );
  }
  timeline.to(
    dialog,
    { autoAlpha: 0, duration, ease: "power2.in" },
    0,
  );
}
