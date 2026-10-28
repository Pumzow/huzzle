import { CustomPuzzleScene } from "../scenes/customPuzzleScene";
import { GameIntroScene } from "../scenes/gameIntroScene";
import { MainMenuScene } from "../scenes/mainMenuScene";
import { PuzzleScene } from "../scenes/puzzleScene";
import type { SceneRegistry } from "../types/sceneTypes";

export const sceneRegistry = {
  gameIntro: GameIntroScene,
  mainMenu: MainMenuScene,
  puzzle: PuzzleScene,
  customPuzzle: CustomPuzzleScene,
} satisfies SceneRegistry;
