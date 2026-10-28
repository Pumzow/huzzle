import type { SceneConfiguration } from "../../types/sceneConfigTypes";

export const mainMenuSceneConfig = {
  ads: {
    showBanner: true,
  },
} as const satisfies SceneConfiguration;
