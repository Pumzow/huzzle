import type { SceneConfiguration } from "../../types/sceneConfigTypes";
import type { LevelMode } from "../../types/levelModeTypes";

type MainMenuSceneConfig = SceneConfiguration & {
  modes: {
    default: LevelMode;
    challengeUnlock: {
      enabled: boolean;
      requiredCasualLevels: number;
    };
  };
};

export const mainMenuSceneConfig = {
  ads: {
    showBanner: true,
  },
  modes: {
    default: "casual",
    challengeUnlock: {
      enabled: true,
      requiredCasualLevels: 3,
    },
  },
} as const satisfies MainMenuSceneConfig;
