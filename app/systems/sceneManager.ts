import {
  initializeVisualEffects,
  triggerBackgroundReaction,
} from "../effects/ambientEffects";
import { InteractionEffects } from "../effects/interactionEffects";
import { prefersReducedMotion } from "../effects/reducedMotion";
import {
  animateSceneEntrance,
  animateSceneExit,
} from "../effects/sceneEffects";
import type {
  Scene,
  SceneNavigator,
  SceneRegistry,
  SceneRoute,
  SceneRoutes,
  SceneType,
} from "../types/sceneTypes";
import type { SceneConfiguration } from "../types/sceneConfigTypes";

type SceneChanged = (config: SceneConfiguration) => void;

export class SceneManager implements SceneNavigator {
  private currentScene: Scene | null = null;
  private currentSceneName: SceneRoute | null = null;
  private transition = 0;
  private readonly interactionEffects: InteractionEffects;
  private readonly cleanupVisualEffects: () => void;

  constructor(
    private readonly root: HTMLElement,
    private readonly scenes: SceneRegistry,
    private readonly onSceneChanged: SceneChanged = () => undefined,
  ) {
    this.cleanupVisualEffects = initializeVisualEffects();
    this.interactionEffects = new InteractionEffects(root);
  }

  navigate<Route extends SceneRoute>(
    route: Route,
    ...args: SceneRoutes[Route]
  ): void {
    const SceneClass = this.scenes[route] as SceneType<Route>;
    const transition = ++this.transition;
    const mountScene = () => {
      if (transition !== this.transition) return;

      this.currentScene?.destroy();
      this.currentScene = new SceneClass(this.root, this, ...args);
      this.activate(route, SceneClass);
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

  async navigateWhenReady<Route extends SceneRoute>(
    route: Route,
    ...args: SceneRoutes[Route]
  ): Promise<void> {
    const SceneClass = this.scenes[route] as SceneType<Route>;
    const transition = ++this.transition;
    const stage = document.createElement("div");
    stage.className = "scene-stage";
    this.root.append(stage);

    let nextScene: Scene;
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
    this.currentScene = nextScene;
    this.activate(route, SceneClass);
    triggerBackgroundReaction("scene");
  }

  get activeScene(): SceneRoute | null {
    return this.currentSceneName;
  }

  destroy(): void {
    this.transition += 1;
    this.currentScene?.destroy();
    this.currentScene = null;
    this.currentSceneName = null;
    delete this.root.dataset.scene;
    this.interactionEffects.destroy();
    this.cleanupVisualEffects();
    this.root.replaceChildren();
  }

  private activate<Route extends SceneRoute>(
    route: Route,
    SceneClass: SceneType<Route>,
  ): void {
    this.currentSceneName = route;
    this.root.dataset.scene = route;
    this.onSceneChanged(SceneClass.sceneConfig);
  }
}
