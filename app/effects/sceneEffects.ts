import { gsap } from "gsap";
import { gameConfig } from "../config/gameConfig";
import { prefersReducedMotion } from "./reducedMotion";

export function animateSceneEntrance(element: HTMLElement | null): void {
  if (!element || prefersReducedMotion()) return;
  const config = gameConfig.visualEffects.sceneTransition;
  gsap.fromTo(
    element,
    {
      autoAlpha: 0,
      filter: `blur(${config.blurPx}px)`,
      scale: config.initialScale,
      y: config.offsetPx,
    },
    {
      autoAlpha: 1,
      clearProps: "all",
      duration: config.duration,
      ease: "power2.out",
      filter: "blur(0px)",
      scale: 1,
      y: 0,
    },
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
      onComplete: resolve,
      overwrite: true,
      scale: 0.985,
      y: config.offsetPx * -0.6,
    });
  });
}

export function animateLeaderboardRows(rows: HTMLElement[]): void {
  if (prefersReducedMotion()) return;
  const config = gameConfig.visualEffects.leaderboard;
  rows.forEach((row, index) => {
    const delay =
      Math.min(index, config.maximumStaggeredRows) * config.rowStagger;
    gsap.fromTo(
      row,
      { autoAlpha: 0, scale: 0.985, x: 22 },
      {
        autoAlpha: 1,
        clearProps: "opacity,visibility,transform",
        delay,
        duration: config.rowDuration,
        ease: "power2.out",
        scale: 1,
        x: 0,
      },
    );
  });
  rows.forEach((row, index) => {
    if (!row.classList.contains("is-current")) return;
    const sweep = row.querySelector<HTMLElement>(".leaderboard-sweep");
    if (!sweep) return;
    gsap.fromTo(
      sweep,
      { xPercent: -130 },
      {
        delay:
          0.18 +
          Math.min(index, config.maximumStaggeredRows) * config.rowStagger,
        duration: config.currentPlayerSweep,
        ease: "power2.out",
        xPercent: 130,
      },
    );
  });
}

export function animateMenuPoints(element: HTMLElement): void {
  if (prefersReducedMotion()) return;
  gsap.fromTo(
    element,
    { autoAlpha: 0, rotation: -10, scale: 0.45, y: 10 },
    {
      autoAlpha: 1,
      duration: gameConfig.visualEffects.mainMenu.pointsDuration,
      ease: "back.out(1.7)",
      rotation: 0,
      scale: 1,
      y: 0,
    },
  );
}

export function createSceneMotion(
  root: HTMLElement,
  type: "intro" | "menu",
): gsap.Context {
  return gsap.context(() => {
    if (prefersReducedMotion()) return;
    if (type === "intro") {
      const config = gameConfig.visualEffects.intro;
      gsap.from(".intro-center", {
        autoAlpha: 0,
        duration: config.entranceDuration,
        ease: "power2.out",
        scale: 0.96,
        y: 18,
      });
      gsap.fromTo(
        ".intro-prompt",
        { autoAlpha: 1, y: 0 },
        {
          autoAlpha: config.promptMinimumOpacity,
          duration: config.promptDuration / 2,
          ease: "sine.inOut",
          repeat: -1,
          y: 2,
          yoyo: true,
        },
      );
      gsap.to(".intro-figure", {
        duration: config.figureDuration / 2,
        ease: "sine.inOut",
        repeat: -1,
        rotation: 14,
        scale: 1.12,
        x: "-13vw",
        y: "-9vh",
        yoyo: true,
      });
      gsap.to(".intro-scene", {
        backgroundPosition: "8% 4%, 92% 88%, 0 0",
        duration: config.ambientDuration / 2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      return;
    }
    const config = gameConfig.visualEffects.mainMenu;
    gsap.from(".menu-card", {
      autoAlpha: 0,
      duration: config.entranceDuration,
      ease: "power2.out",
      y: 14,
    });
    gsap.to(".menu-decoration-one", {
      duration: config.firstDecorationDuration / 2,
      ease: "sine.inOut",
      repeat: -1,
      rotation: 22,
      scale: 1.08,
      x: "12vw",
      y: "10vh",
      yoyo: true,
    });
    gsap.to(".menu-decoration-two", {
      duration: config.secondDecorationDuration / 2,
      ease: "sine.inOut",
      repeat: -1,
      rotation: -18,
      scale: 0.92,
      x: "-10vw",
      y: "-12vh",
      yoyo: true,
    });
  }, root);
}
