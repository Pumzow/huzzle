import { customPuzzleSceneConfig } from "../config/scenes/customPuzzleSceneConfig";
import type { SceneNavigator } from "../types/sceneTypes";
import { PuzzleScene, type PuzzleSceneConfig } from "./puzzleScene";

export class CustomPuzzleScene extends PuzzleScene {
  static override readonly sceneConfig: PuzzleSceneConfig = customPuzzleSceneConfig;

  constructor(root: HTMLElement, navigator: SceneNavigator, initialImageFile: File) {
    super(root, navigator, { initialImageFile });
  }

  protected override getConfig(): PuzzleSceneConfig {
    return customPuzzleSceneConfig;
  }
}
