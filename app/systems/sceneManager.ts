import { appConfig, resolveAssetPath } from "../config/appConfig";
import { soundManager } from "./soundManager";

export type Scene = {
  destroy(): void;
};

export type SceneType<Arguments extends unknown[] = []> = {
  readonly sceneName: string;
  new (root: HTMLElement, sceneManager: SceneManager, ...args: Arguments): Scene;
};

export class SceneManager {
  private currentScene: Scene | null = null;
  private currentSceneName: string | null = null;
  private readonly soundtrack = resolveAssetPath(appConfig.soundtrack.file);

  constructor(private readonly root: HTMLElement) {
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
  }

  loadScene<Arguments extends unknown[]>(SceneClass: SceneType<Arguments>, ...args: Arguments): void {
    this.currentScene?.destroy();
    this.currentSceneName = SceneClass.sceneName;
    this.root.dataset.scene = SceneClass.sceneName;
    this.currentScene = new SceneClass(this.root, this, ...args);
  }

  get activeScene(): string | null {
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
