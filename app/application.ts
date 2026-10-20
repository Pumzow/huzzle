import { appConfig } from "./config/appConfig";
import { sceneRegistry } from "./navigation/sceneRegistry";
import { platformSession } from "./services/platformSession";
import { AdsManager } from "./systems/ads/adsManager";
import { SceneManager } from "./systems/sceneManager";
import { GameAudioController } from "./systems/gameAudioController";
import { HuzzleAudioBackend } from "./systems/huzzleAudioBackend";
import { soundManager } from "./systems/soundManager";
import { themeManager } from "./systems/themeManager";
import type { SceneConfiguration } from "./types/sceneConfigTypes";
import type { Scene } from "./types/sceneTypes";
import { DebugPanel } from "./debug/debugPanel";

export class HuzzleApplication {
  private readonly adsManager = new AdsManager();
  private readonly sceneManager: SceneManager;
  private readonly debugPanel: DebugPanel | null;
  private readonly gameAudioController: GameAudioController;
  private started = false;

  constructor(private readonly root: HTMLElement) {
    this.gameAudioController = new GameAudioController({
      backend: new HuzzleAudioBackend(),
    });
    this.debugPanel = appConfig.debug.enabled
      ? new DebugPanel(this.adsManager)
      : null;
    this.sceneManager = new SceneManager(
      root,
      sceneRegistry,
      { adsManager: this.adsManager },
      this.handleSceneChanged
    );
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    themeManager.initialize();
    void platformSession.restore();
    const adsReady = this.adsManager.initialize();
    this.sceneManager.navigate("gameIntro", adsReady);
    requestAnimationFrame(() =>
      document.documentElement.classList.remove("app-booting")
    );
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
  }

  destroy(): void {
    if (!this.started) return;
    this.started = false;
    window.removeEventListener("pagehide", this.handlePageHide);
    this.sceneManager.destroy();
    this.debugPanel?.destroy();
    this.gameAudioController.destroy();
    void this.adsManager.destroy();
    soundManager.destroy();
  }

  private handleSceneChanged = (
    config: SceneConfiguration,
    scene: Scene
  ): void => {
    void this.adsManager.setBannerVisible(config.ads.showBanner);
    this.debugPanel?.setScene(scene);
  };

  private handlePageHide = (): void => this.destroy();
}
