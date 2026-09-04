import { appConfig, resolveAssetPath } from "../config/appConfig";
import { soundManager } from "./soundManager";
import {
  animateSceneEntrance,
  animateSceneExit,
  initializeVisualEffects,
  InteractionEffects,
  prefersReducedMotion,
  triggerBackgroundReaction,
} from "./visualEffects";

export type Scene = {
  destroy(): void;
};

export type SceneType<Arguments extends unknown[] = []> = {
  readonly sceneName: string;
  new (
    root: HTMLElement,
    sceneManager: SceneManager,
    ...args: Arguments
  ): Scene;
};

export class SceneManager {
  private currentScene: Scene | null = null;
  private currentSceneName: string | null = null;
  private transition = 0;
  private readonly soundtrack = resolveAssetPath(appConfig.soundtrack.file);
  private readonly interactionEffects: InteractionEffects;
  private readonly cleanupVisualEffects: () => void;

  constructor(private readonly root: HTMLElement) {
    this.cleanupVisualEffects = initializeVisualEffects();
    this.interactionEffects = new InteractionEffects(root);
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
  }

  loadScene<Arguments extends unknown[]>(
    SceneClass: SceneType<Arguments>,
    ...args: Arguments
  ): void {
    const transition = ++this.transition;
    const mountScene = () => {
      if (transition !== this.transition) return;

      this.currentScene?.destroy();
      this.currentSceneName = SceneClass.sceneName;
      this.root.dataset.scene = SceneClass.sceneName;
      this.currentScene = new SceneClass(this.root, this, ...args);
      animateSceneEntrance(this.root.firstElementChild as HTMLElement | null);
      triggerBackgroundReaction("scene");
    };

    const outgoing = this.root.firstElementChild;
    if (
      !this.currentScene ||
      !outgoing ||
      prefersReducedMotion()
    ) {
      mountScene();
      return;
    }

    void animateSceneExit(outgoing).then(mountScene);
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

    const outgoing = Array.from(this.root.children).find(
      (element) => element !== stage
    );
    if (
      outgoing &&
      !prefersReducedMotion()
    ) {
      await animateSceneExit(outgoing);
    }

    if (transition !== this.transition) {
      nextScene.destroy();
      stage.remove();
      return;
    }

    this.currentScene?.destroy();
    stage.classList.remove("scene-stage");
    animateSceneEntrance(stage);
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
    this.cleanupVisualEffects();
    this.root.replaceChildren();
  }
}
