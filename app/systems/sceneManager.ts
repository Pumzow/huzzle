import { SceneManager as CoreSceneManager } from "@pumzow/game-engine";
import { AppHeader, appHeaderMarkup } from "../components/common/appHeader";
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
import type { SceneConfiguration } from "../types/sceneConfigTypes";
import type {
  Scene,
  SceneNavigator,
  SceneRegistry,
  SceneRoute,
  SceneRoutes,
  SceneType,
} from "../types/sceneTypes";

type SceneChanged = (config: SceneConfiguration, scene: Scene) => void;

export class SceneManager implements SceneNavigator {
  private readonly runtime: CoreSceneManager<
    SceneRoutes,
    SceneNavigator,
    Scene
  >;
  private readonly interactionEffects: InteractionEffects;
  private readonly cleanupVisualEffects: () => void;
  private readonly sceneRoot: HTMLElement;
  private readonly header: AppHeader;

  constructor(
    private readonly root: HTMLElement,
    private readonly scenes: SceneRegistry,
    services: Pick<SceneNavigator, "adsManager">,
    private readonly onSceneChanged: SceneChanged = () => undefined
  ) {
    root.innerHTML = `${appHeaderMarkup()}<div class="scene-host"></div>`;
    this.sceneRoot = root.querySelector<HTMLElement>(".scene-host")!;
    this.adsManager = services.adsManager;
    this.header = new AppHeader(root, () =>
      this.navigate("mainMenu")
    );
    this.header.update(false, false);
    this.cleanupVisualEffects = initializeVisualEffects();
    this.interactionEffects = new InteractionEffects(root);
    this.runtime = new CoreSceneManager(this.sceneRoot, scenes, this, {
      activated: this.activate,
      enter: (element) => animateSceneEntrance(element),
      exit: (element) =>
        prefersReducedMotion() ? undefined : animateSceneExit(element),
    });
  }

  readonly adsManager: SceneNavigator["adsManager"];

  navigate<Route extends SceneRoute>(
    route: Route,
    ...args: SceneRoutes[Route]
  ): void {
    this.runtime.navigate(route, ...args);
  }

  navigateWhenReady<Route extends SceneRoute>(
    route: Route,
    ...args: SceneRoutes[Route]
  ): Promise<void> {
    return this.runtime.navigateWhenReady(route, ...args);
  }

  get activeScene(): SceneRoute | null {
    return this.runtime.activeScene;
  }

  refreshHeader(): void {
    if (this.runtime.activeScene !== "gameIntro") this.header.refresh();
  }

  destroy(): void {
    this.runtime.destroy();
    delete this.root.dataset.scene;
    this.header.destroy();
    this.interactionEffects.destroy();
    this.cleanupVisualEffects();
    this.root.replaceChildren();
  }

  private activate = <Route extends SceneRoute>(
    route: Route,
    scene: Scene
  ): void => {
    const SceneClass = this.scenes[route] as SceneType<Route>;
    this.root.dataset.scene = route;
    this.header.update(
      route !== "gameIntro",
      route === "puzzle" || route === "customPuzzle"
    );
    this.onSceneChanged(SceneClass.sceneConfig, scene);
    triggerBackgroundReaction("scene");
  };
}
