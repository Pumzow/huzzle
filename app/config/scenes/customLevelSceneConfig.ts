export const customLevelSceneConfig = {
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
    targetPreview: {
      enabled: true,
      allowReveal: true,
    },
    completionModal: {
      enabled: true,
    },
  },
} as const;
