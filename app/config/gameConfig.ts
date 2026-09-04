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
      duration: 0.24,
      peakScale: 1.08,
      easingPower: 3,
    },
    connection: {
      duration: 0.68,
      hotColor: 0xff6f3c,
      glowColor: 0xffd166,
      hotPhaseEnd: 0.5,
      glowPhaseEnd: 0.82,
      minimumAlpha: 0.86,
    },
    completion: {
      wave: {
        delayBeforeStart: 0,
        duration: 0.98,
        scale: 1.065,
        boardImpactScale: 0.965,
        boardImpactBrightness: 1.28,
      },
      modal: {
        delayBeforeShow: 0.4,
        duration: 0.35,
      },
      stars: {
        delays: {
          beforeFirstShow: 0.4,
          betweenShows: 0.28,
        },
        duration: 0.56,
        peakScale: 1.42,
      },
      message: {
        delayBeforeShow: 1,
        duration: 0.42,
      },
      points: {
        delayBeforeShow: 1.5,
        countDuration: 1,
        impactDuration: 0.5,
        peakScale: 0.3,
      },
      actions: {
        delays: {
          beforeShow: 3,
          beforeShowForCheater: 3.2,
          beforeShowWithoutPoints: 2.34,
        },
        duration: 0.6,
      },
      particles: {
        delays: {
          beforeFirstShow: 1,
          betweenShows: 0.02,
        },
        duration: 0.98,
        scale: 1.35,
        sizePx: 9,
      },
    },
    sceneTransition: {
      duration: 0.32,
      offsetPx: 22,
      initialScale: 0.975,
      blurPx: 5,
    },
    panel: {
      duration: 0.42,
      initialScale: 0.9,
      offsetPx: 18,
    },
    intro: {
      entranceDuration: 0.7,
      promptDuration: 1.8,
      ambientDuration: 18,
      figureDuration: 22,
    },
    hint: {
      duration: 0.12,
    },
    mainMenu: {
      entranceDuration: 0.45,
      pointsDuration: 0.56,
      firstDecorationDuration: 17,
      secondDecorationDuration: 21,
    },
    leaderboard: {
      rowDuration: 0.36,
      rowStagger: 0.048,
      maximumStaggeredRows: 10,
      currentPlayerSweep: 0.76,
    },
    themeTransition: {
      duration: 0.5,
      easing: "sine.inOut",
    },
    buttonFeedback: {
      pressDuration: 0.18,
      pressScale: 0.94,
      rippleDuration: 0.52,
      rippleScale: 2.8,
      rippleOpacity: 0.3,
    },
    backgroundReaction: {
      firstDriftDuration: 20,
      secondDriftDuration: 24,
      blurPx: 58,
      sceneReactionBlurPx: 44,
      completionReactionBlurPx: 36,
      sceneDuration: 0.9,
      completionDuration: 1.3,
      completionScale: 1.22,
      completionSaturation: 1.65,
    },
  },
} as const;
