import { appConfig, resolveAssetPath } from "../config/appConfig";
import { soundManager } from "./soundManager";
import { gameConfig } from "../config/gameConfig";
import { applyVisualEffectVariables, InteractionEffects, triggerBackgroundReaction } from "./visualEffects";

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
  private transition = 0;
  private readonly soundtrack = resolveAssetPath(appConfig.soundtrack.file);
  private readonly interactionEffects: InteractionEffects;

  constructor(private readonly root: HTMLElement) {
    applyVisualEffectVariables(root);
    this.interactionEffects = new InteractionEffects(root);
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
  }

  loadScene<Arguments extends unknown[]>(SceneClass: SceneType<Arguments>, ...args: Arguments): void {
    this.transition += 1;
    this.currentScene?.destroy();
    this.currentSceneName = SceneClass.sceneName;
    this.root.dataset.scene = SceneClass.sceneName;
    this.currentScene = new SceneClass(this.root, this, ...args);
    this.root.firstElementChild?.classList.add("scene-enter");
    triggerBackgroundReaction("scene");
  }

  async loadSceneWhenReady<Arguments extends unknown[]>(
    SceneClass: SceneType<Arguments>,
    ...args: Arguments
  ): Promise<void> {
    const transition = ++this.transition;
    const stage = document.createElement("div");
    stage.className = "scene-stage";
    this.root.append(stage);

    let nextScene: Scene & { ready?: Promise<void> };
    try {
      nextScene = new SceneClass(stage, this, ...args);
      await nextScene.ready;
    } catch (error) {
      stage.remove();
      throw error;
    }

    if (transition !== this.transition) {
      nextScene.destroy();
      stage.remove();
      return;
    }

    const outgoing = Array.from(this.root.children).find((element) => element !== stage);
    if (outgoing && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      outgoing.classList.add("scene-exit");
      await new Promise((resolve) => window.setTimeout(resolve, gameConfig.visualEffects.sceneTransition.durationMs));
    }

    if (transition !== this.transition) {
      nextScene.destroy();
      stage.remove();
      return;
    }

    this.currentScene?.destroy();
    stage.classList.remove("scene-stage");
    stage.classList.add("scene-enter");
    this.root.replaceChildren(stage);
    this.currentSceneName = SceneClass.sceneName;
    this.root.dataset.scene = SceneClass.sceneName;
    this.currentScene = nextScene;
    triggerBackgroundReaction("scene");
  }

  get activeScene(): string | null {
    return this.currentSceneName;
  }

  private handlePageHide = () => this.destroy();

  destroy(): void {
    this.transition += 1;
    window.removeEventListener("pagehide", this.handlePageHide);
    this.currentScene?.destroy();
    this.currentScene = null;
    this.currentSceneName = null;
    delete this.root.dataset.scene;
    soundManager.stopSound(this.soundtrack);
    this.interactionEffects.destroy();
    this.root.replaceChildren();
  }
}
