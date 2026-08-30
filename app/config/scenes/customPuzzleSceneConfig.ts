export const customPuzzleSceneConfig = {
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
    },
  },
} as const;
