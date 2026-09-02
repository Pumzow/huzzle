import { huzzle } from "drygon-huzzle-rules";

import type { PuzzleScoringConfig, TileShape } from "../../types/gameTypes";

export const puzzleSceneConfig = {
  enabledShapes: [
    { value: "square", weight: 7 },
    { value: "card", weight: 5 },
    { value: "verticalHexagon", weight: 2 },
  ] as const satisfies readonly TileShape[],
  levels: {
    requestTimeoutMs: 8000,
    selectionMode: "sequence",
    gridSizeSequence: huzzle.config.gridSizeSequence,
    useLevelIdSeed: true,
  },
  scoring: {
    startingStars: huzzle.config.maximumStars,
    pointsPerStar: huzzle.config.pointsPerStar,
    gridSizeMultipliers: huzzle.config.gridSizeMultipliers,
    tileShapeMultipliers: huzzle.config.tileShapeMultipliers,
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
