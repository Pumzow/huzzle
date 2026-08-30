export const puzzleSceneConfig = {
  levels: {
    requestTimeoutMs: 8000,
    selectionMode: "sequence",
  },
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
      allowRestart: true,
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
