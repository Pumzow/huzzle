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
import { AppHeader, appHeaderMarkup } from "../components/common/appHeader";

type SceneChanged = (config: SceneConfiguration, scene: Scene) => void;

export class SceneManager implements SceneNavigator {
  private currentScene: Scene | null = null;
  private currentSceneName: SceneRoute | null = null;
  private transition = 0;
  private readonly interactionEffects: InteractionEffects;
  private readonly cleanupVisualEffects: () => void;
  private readonly sceneRoot: HTMLElement;
  private readonly header: AppHeader;

  constructor(
    private readonly root: HTMLElement,
    private readonly scenes: SceneRegistry,
    private readonly onSceneChanged: SceneChanged = () => undefined,
  ) {
    root.innerHTML = `${appHeaderMarkup()}<div class="scene-host"></div>`;
    this.sceneRoot = root.querySelector<HTMLElement>(".scene-host")!;
    this.header = new AppHeader(root, () => this.navigate("mainMenu"));
    this.header.update(false, false);
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
      this.currentScene = new SceneClass(this.sceneRoot, this, ...args);
      this.activate(route, SceneClass, this.currentScene);
      animateSceneEntrance(this.sceneRoot.firstElementChild as HTMLElement | null);
      triggerBackgroundReaction("scene");
    };

    const outgoing = this.sceneRoot.firstElementChild;
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
    this.sceneRoot.append(stage);

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

    const outgoing = Array.from(this.sceneRoot.children).find(
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
    this.sceneRoot.replaceChildren(stage);
    this.currentScene = nextScene;
    this.activate(route, SceneClass, nextScene);
    triggerBackgroundReaction("scene");
  }

  get activeScene(): SceneRoute | null {
    return this.currentSceneName;
  }

  refreshHeader(): void {
    if (this.currentSceneName !== "gameIntro") this.header.refresh();
  }

  destroy(): void {
    this.transition += 1;
    this.currentScene?.destroy();
    this.currentScene = null;
    this.currentSceneName = null;
    delete this.root.dataset.scene;
    this.header.destroy();
    this.interactionEffects.destroy();
    this.cleanupVisualEffects();
    this.root.replaceChildren();
  }

  private activate<Route extends SceneRoute>(
    route: Route,
    SceneClass: SceneType<Route>,
    scene: Scene,
  ): void {
    this.currentSceneName = route;
    this.root.dataset.scene = route;
    this.header.update(
      route !== "gameIntro",
      route === "puzzle" || route === "customPuzzle",
    );
    this.onSceneChanged(SceneClass.sceneConfig, scene);
  }
}
