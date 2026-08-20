import { customPuzzleSceneConfig } from "../config/scenes/customPuzzleSceneConfig";
import type { SceneManager } from "../systems/sceneManager";
import { PuzzleScene, type PuzzleSceneConfig } from "./puzzleScene";

export class CustomPuzzleScene extends PuzzleScene {
  static readonly sceneName = "customPuzzle";

  constructor(root: HTMLElement, sceneManager: SceneManager, initialImageFile: File) {
    super(root, sceneManager, { initialImageFile });
  }

  protected override getConfig(): PuzzleSceneConfig {
    return customPuzzleSceneConfig;
  }
}
