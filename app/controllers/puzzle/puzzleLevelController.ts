import { appConfig } from "../../config/appConfig";
import {
  levelProgressStore,
  type LevelCompletion,
} from "../../services/levelProgressStore";
import { levelDesignFor, type LevelDesign } from "../../systems/levelDesign";
import { levelPreloader } from "../../systems/levelPreloader";
import type { LoadedLevel } from "../../types/levelTypes";
import type { GridSize, TileShape, TileShapeTypes } from "../../types/gameTypes";
import type { PuzzleSceneConfig } from "../../types/puzzleSceneTypes";

type LevelsConfig = NonNullable<PuzzleSceneConfig["levels"]>;

export class PuzzleLevelController {
  constructor(private readonly config: LevelsConfig) {}

  get isCheater(): boolean {
    return levelProgressStore.isCheater;
  }

  designFor(levelId: number, enabledShapes: readonly TileShape[]): LevelDesign {
    return levelDesignFor(levelId, {
      ...this.config,
      enabledShapes,
    });
  }

  async load(
    currentLevelId?: number,
    preparedLevel?: LoadedLevel,
  ): Promise<{ currentLevelId: number; level: LoadedLevel | null }> {
    if (preparedLevel) {
      return { currentLevelId: preparedLevel.id, level: preparedLevel };
    }
    const storedProgress = await levelProgressStore.load();
    const resolvedLevelId = currentLevelId ?? storedProgress.currentLevel;
    try {
      const level = await levelPreloader.take(
        appConfig.levels.manifestUrl,
        {
          mode: this.config.selectionMode,
          currentLevelId: resolvedLevelId,
        },
        this.config.requestTimeout,
      );
      return { currentLevelId: resolvedLevelId, level };
    } catch {
      return { currentLevelId: resolvedLevelId, level: null };
    }
  }

  complete(
    levelId: number,
    stars: number,
    gridSize: GridSize,
    tileShape: TileShapeTypes,
  ): Promise<LevelCompletion> {
    return levelProgressStore.complete(
      levelId + 1,
      stars,
      gridSize,
      tileShape,
    );
  }

  preloadNext(levelId: number): Promise<LoadedLevel | null> {
    return levelPreloader
      .preload(
        appConfig.levels.manifestUrl,
        {
          mode: this.config.selectionMode,
          currentLevelId: levelId + 1,
        },
        this.config.requestTimeout,
      )
      .catch(() => null);
  }
}
