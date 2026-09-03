import { GridSize, TileShapeTypes } from "../types/gameTypes";

export const gameConfig = {
  grid: {
    defaultSize: 4 as GridSize,
    sizes: [4, 6, 8] as readonly GridSize[],
  },
  pieces: {
    defaultShape: "square" as TileShapeTypes,
    shapes: [
      { value: "square", label: "Square" },
      { value: "card", label: "Card", aspectRatio: 3 / 4 },
      { value: "hexagon", label: "Hexagon" },
      { value: "verticalHexagon", label: "Vertical hex" },
      { value: "octagon", label: "Octagon" },
    ] as const satisfies ReadonlyArray<{ value: TileShapeTypes; label: string; aspectRatio?: number }>,
    gap: 0,
    textureSize: 256,
    outlineWidth: 3,
  },
  board: {
    margin: 12,
  },
  visualEffects: {
    tileSettle: {
      durationMs: 240,
      peakScale: 1.08,
      easingPower: 3,
    },
    connection: {
      durationMs: 680,
      hotColor: 0xff6f3c,
      glowColor: 0xffd166,
      hotPhaseEnd: 0.5,
      glowPhaseEnd: 0.82,
      minimumAlpha: 0.86,
    },
    completion: {
      waveDurationMs: 980,
      waveScale: 1.065,
      boardImpactScale: 0.965,
      boardImpactBrightness: 1.28,
      modalDelayMs: 300,
      starDurationMs: 560,
      starInitialDelayMs: 700,
      starStaggerMs: 280,
      starPeakScale: 1.42,
      messageDelayAfterStarsMs: 50,
      messageDurationMs: 420,
      actionsDelayAfterPointsMs: 50,
      actionsDurationMs: 380,
      particleDurationMs: 980,
      particleScale: 1.35,
      particleSizePx: 9,
    },
    sceneTransition: {
      durationMs: 320,
      offsetPx: 22,
      initialScale: 0.975,
      blurPx: 5,
    },
    panel: {
      durationMs: 420,
      initialScale: 0.9,
      offsetPx: 18,
    },
    leaderboard: {
      rowDurationMs: 360,
      rowStaggerMs: 48,
      maximumStaggeredRows: 10,
      currentPlayerSweepMs: 760,
    },
    pointsReward: {
      delayAfterMessageMs: 100,
      countDurationMs: 2220,
      impactDurationMs: 760,
      peakScale: 0.8,
    },
    themeTransition: {
      durationMs: 620,
      easing: "cubic-bezier(.2,.8,.2,1)",
    },
    buttonFeedback: {
      pressDurationMs: 180,
      pressScale: 0.94,
      rippleDurationMs: 520,
      rippleScale: 2.8,
      rippleOpacity: 0.3,
    },
    backgroundReaction: {
      sceneDurationMs: 900,
      completionDurationMs: 1300,
      completionScale: 1.22,
      completionSaturation: 1.65,
    },
  },
} as const;
