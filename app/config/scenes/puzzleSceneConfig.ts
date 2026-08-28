export const puzzleSceneConfig = {
  randomImages: {
    levelsUrl: "https://pi-dev.com/files/huzzle/levels.json",
    imageBaseUrl: "https://pi-dev.com/files/huzzle/images/",
    requestTimeoutMs: 8000,
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
    targetPreview: {
      enabled: true,
      allowReveal: true,
    },
    completionModal: {
      enabled: true,
      allowNextLevel: true,
    },
  },
} as const;
