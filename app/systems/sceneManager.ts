import { appConfig, resolveAssetPath } from "../config/appConfig";
import { customLevelSceneConfig } from "../config/scenes/customLevelSceneConfig";
import { GameIntroScene } from "../scenes/gameIntroScene";
import { MainMenuScene } from "../scenes/mainMenuScene";
import { PuzzleScene } from "../scenes/puzzleScene";
import { soundManager } from "./soundManager";

type Scene = {
  destroy(): void;
};

export type SceneName = "gameIntro" | "mainMenu" | "puzzle";

export class SceneManager {
  private currentScene: Scene | null = null;
  private currentSceneName: SceneName | null = null;
  private readonly soundtrack = resolveAssetPath(appConfig.soundtrack.file);

  constructor(private readonly root: HTMLElement) {
    if (appConfig.soundtrack.enabled) {
      soundManager.playSound(this.soundtrack, appConfig.soundtrack.loop, "music");
    }
    this.showIntro();
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
  }

  private mount(name: SceneName, factory: () => Scene): void {
    this.currentScene?.destroy();
    this.currentSceneName = name;
    this.root.dataset.scene = name;
    this.currentScene = factory();
  }

  showIntro(): void {
    this.mount("gameIntro", () => new GameIntroScene(this.root, () => this.showMainMenu()));
  }

  showMainMenu(): void {
    this.mount("mainMenu", () => new MainMenuScene(this.root, {
      onPlay: () => this.showPuzzle(),
      onCustomLevel: (file) => this.showCustomLevel(file),
    }));
  }

  showPuzzle(): void {
    this.mount("puzzle", () => new PuzzleScene(this.root, {
      onBack: () => this.showMainMenu(),
    }));
  }

  showCustomLevel(initialImageFile: File): void {
    this.mount("puzzle", () => new PuzzleScene(this.root, {
      config: customLevelSceneConfig,
      initialImageFile,
      onBack: () => this.showMainMenu(),
    }));
  }

  get activeScene(): SceneName | null {
    return this.currentSceneName;
  }

  private handlePageHide = () => this.destroy();

  destroy(): void {
    window.removeEventListener("pagehide", this.handlePageHide);
    this.currentScene?.destroy();
    this.currentScene = null;
    this.currentSceneName = null;
    delete this.root.dataset.scene;
    soundManager.stopSound(this.soundtrack);
    this.root.replaceChildren();
  }
}
