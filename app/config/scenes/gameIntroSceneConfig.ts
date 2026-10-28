import type { SceneConfiguration } from "../../types/sceneConfigTypes";

export const gameIntroSceneConfig = {
  ads: {
    showBanner: false,
  },
  loadingPrompt: "Painting...",
  minimumLoading: 0.6,
  maximumAdsWait: 5,
  touchPrompt: "Tap to start",
  pointerPrompt: "Click or press any key to start",
} as const satisfies SceneConfiguration & Record<string, unknown>;
