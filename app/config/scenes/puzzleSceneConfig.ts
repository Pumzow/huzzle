import type { GridSize, PuzzleScoringConfig, TileShape } from "../../types/gameTypes";

export const puzzleSceneConfig = {
  enabledShapes: [
    { value: "square", weight: 7 },
    { value: "card", weight: 5 },
    { value: "verticalHexagon", weight: 2 },
  ] as const satisfies readonly TileShape[],
  levels: {
    requestTimeoutMs: 8000,
    selectionMode: "sequence",
    gridSizeSequence: [4, 4, 6] as readonly GridSize[],
    useLevelIdSeed: true,
  },
  scoring: {
    startingStars: 3,
    pointsPerStar: 100,
    gridSizeMultipliers: { 4: 1, 6: 1.5, 8: 2 },
    tileShapeMultipliers: {
      square: 1,
      card: 1.1,
      hexagon: 1.3,
      verticalHexagon: 1.3,
      octagon: 1.1,
    },
    baseTimeSeconds: 20,
    secondsPerStartingSet: 7,
    moveAllowanceMultiplier: .5,
    minimumFreeMoves: 4,
  } as const satisfies PuzzleScoringConfig,
  components: {
    header: {
      enabled: true,
    },
    board: {
      enabled: true,
    },
    hud: {
      enabled: true,
      showMoves: true,
      showTimer: true,
      showStars: true,
    },
    controls: {
      enabled: false,
      allowImageUpload: true,
      allowShapeSelection: true,
      allowGridSelection: true,
      allowRestart: false,
    },
    targetHint: {
      enabled: true,
      allowUse: true,
    },
    completionModal: {
      enabled: true,
      allowNextLevel: true,
    },
  },
} as const;
