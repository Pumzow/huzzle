import type { LoadedLevel, LevelSelectionMode } from "../systems/levelService";
import type {
  GridSize,
  PuzzleScoringConfig,
  TileShape,
} from "./gameTypes";

export type PuzzleSceneOptions = {
  initialImageFile?: File;
  currentLevelId?: number;
  preparedLevel?: LoadedLevel;
  skipLevelLoad?: boolean;
};

export type PuzzleSceneConfig = {
  enabledShapes: readonly TileShape[];
  scoring: PuzzleScoringConfig;
  levels?: {
    requestTimeout: number;
    selectionMode: LevelSelectionMode;
    gridSizeSequence: readonly GridSize[];
    useLevelIdSeed: boolean;
  };
  components: {
    header: { enabled: boolean };
    board: { enabled: boolean };
    hud: {
      enabled: boolean;
      showMoves: boolean;
      showTimer: boolean;
      showStars: boolean;
    };
    controls: {
      enabled: boolean;
      allowImageUpload: boolean;
      allowShapeSelection: boolean;
      allowGridSelection: boolean;
      allowRestart: boolean;
    };
    targetHint: {
      enabled: boolean;
      allowUse: boolean;
    };
    completionModal: {
      enabled: boolean;
      allowNextLevel: boolean;
      allowShuffle: boolean;
    };
  };
};
