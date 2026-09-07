import { appConfig, resolveAssetPath } from "./config/appConfig";
import { sceneRegistry } from "./navigation/sceneRegistry";
import { platformSession } from "./services/platformSession";
import { adsManager } from "./systems/ads/adsManager";
import { SceneManager } from "./systems/sceneManager";
import { soundManager } from "./systems/soundManager";
import { themeManager } from "./systems/themeManager";
import type { SceneConfiguration } from "./types/sceneConfigTypes";

export class HuzzleApplication {
  private readonly scenes: SceneManager;
  private readonly soundtrack = resolveAssetPath(appConfig.soundtrack.file);
  private started = false;

  constructor(private readonly root: HTMLElement) {
    this.scenes = new SceneManager(root, sceneRegistry, this.handleSceneChanged);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    themeManager.initialize();
    void platformSession.restore();
    const adsReady = adsManager.initialize();
    this.scenes.navigate("gameIntro", adsReady);
    requestAnimationFrame(() =>
      document.documentElement.classList.remove("app-booting"),
    );
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
  }

  destroy(): void {
    if (!this.started) return;
    this.started = false;
    window.removeEventListener("pagehide", this.handlePageHide);
    this.scenes.destroy();
    soundManager.stopSound(this.soundtrack);
    void adsManager.destroy();
  }

  private handleSceneChanged = (config: SceneConfiguration): void => {
    void adsManager.setBannerVisible(config.ads.showBanner);
  };

  private handlePageHide = (): void => this.destroy();
}
