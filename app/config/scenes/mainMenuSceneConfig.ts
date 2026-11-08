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
  modeSelector: {
    enabled: boolean;
    revealAfterChallengeUnlock: boolean;
    swipeBackground: boolean;
    swipeThresholdPx: number;
    horizontalIntentRatio: number;
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
  modeSelector: {
    enabled: true,
    revealAfterChallengeUnlock: true,
    swipeBackground: true,
    swipeThresholdPx: 60,
    horizontalIntentRatio: 1.25,
  },
} as const satisfies MainMenuSceneConfig;
