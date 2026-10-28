import type { LoadedLevel, LevelSelectionMode } from "./levelTypes";
import type {
  GridSize,
  PuzzleScoringConfig,
  TileShape,
} from "./gameTypes";
import type { SceneConfiguration } from "./sceneConfigTypes";
import type { PlatformVisibleConfig } from "../utils/deviceCapabilities";

export type PuzzleSceneOptions = {
  initialImageFile?: File;
  currentLevelId?: number;
  offlineLevelIndex?: number;
  preparedLevel?: LoadedLevel;
  skipLevelLoad?: boolean;
};

export type PuzzleSceneConfig = SceneConfiguration & {
  enabledShapes: readonly TileShape[];
  scoring: PuzzleScoringConfig;
  levels?: {
    requestTimeout: number;
    selectionMode: LevelSelectionMode;
    gridSizeSequence: readonly GridSize[];
    useLevelIdSeed: boolean;
  };
  components: {
    header: PlatformVisibleConfig;
    board: PlatformVisibleConfig;
    hud: PlatformVisibleConfig & {
      showMoves: boolean;
      showTimer: boolean;
      showStars: boolean;
    };
    controls: PlatformVisibleConfig & {
      allowImageUpload: boolean;
      allowShapeSelection: boolean;
      allowGridSelection: boolean;
      allowRestart: boolean;
    };
    targetHint: PlatformVisibleConfig & {
      allowUse: boolean;
    };
    completionModal: PlatformVisibleConfig & {
      allowNextLevel: boolean;
      allowShuffle: boolean;
    };
  };
};
