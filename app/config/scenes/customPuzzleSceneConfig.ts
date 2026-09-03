import type { PuzzleScoringConfig, TileShape } from "../../types/gameTypes";

export const customPuzzleSceneConfig = {
  enabledShapes: [
    { value: "square" },
    { value: "card" },
    { value: "verticalHexagon" },
  ] as const satisfies readonly TileShape[],
  scoring: {
    startingStars: 3,
    pointsPerStar: 100,
    gridSizeMultipliers: { 4: 1, 6: 1.5, 8: 2 },
    tileShapeMultipliers: {
      square: 1,
      card: 1.1,
      hexagon: 1.2,
      verticalHexagon: 1.2,
      octagon: 1.25,
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
      enabled: true,
      allowImageUpload: true,
      allowShapeSelection: true,
      allowGridSelection: true,
      allowRestart: true,
    },
    targetHint: {
      enabled: false,
      allowUse: true,
    },
    completionModal: {
      enabled: true,
      allowNextLevel: false,
      allowShuffle: true,
    },
  },
} as const;
