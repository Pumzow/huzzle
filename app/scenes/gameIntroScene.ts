import { gsap } from "gsap";
import { brandMarkup } from "../components/common/brand";
import { appConfig, resolveAssetPath } from "../config/appConfig";
import { gameIntroSceneConfig } from "../config/scenes/gameIntroSceneConfig";
import { MainMenuScene } from "./mainMenuScene";
import type { SceneManager } from "../systems/sceneManager";
import { soundManager } from "../systems/soundManager";
import { adsManager } from "../systems/ads/adsManager";
import { prefersReducedMotion } from "../effects/reducedMotion";
import { createSceneMotion } from "../effects/sceneEffects";
import { wait } from "../utils/time";

export class GameIntroScene {
  static readonly sceneName = "gameIntro";

  private completed = false;
  private ready = false;
  private destroyed = false;
  private readonly continueButton: HTMLButtonElement;
  private readonly promptElement: HTMLElement;
  private readonly motion: ReturnType<typeof createSceneMotion>;
  private loadingTween: gsap.core.Tween | null = null;

  constructor(private readonly root: HTMLElement, private readonly sceneManager: SceneManager) {
    const usesTouch = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    const prompt = usesTouch ? gameIntroSceneConfig.touchPrompt : gameIntroSceneConfig.pointerPrompt;
    root.innerHTML = `<main class="scene-shell intro-scene" aria-label="Huzzle introduction">
      <i class="intro-figure" aria-hidden="true"></i>
      <button class="intro-continue" type="button" aria-label="${gameIntroSceneConfig.loadingPrompt}" aria-busy="true" disabled>
        <span class="intro-center">
          ${brandMarkup("intro-brand", "span")}
          <span class="intro-tagline">Swap · connect · complete</span>
          <span class="intro-prompt" data-intro-prompt aria-live="polite"><i class="intro-loader" aria-hidden="true"></i>${gameIntroSceneConfig.loadingPrompt}</span>
        </span>
      </button>
      <a class="image-credit" href="https://www.pexels.com" target="_blank" rel="noreferrer">Images provided by Pexels</a>
    </main>`;
    const continueButton = root.querySelector<HTMLButtonElement>(".intro-continue");
    if (!continueButton) throw new Error("Missing intro continue button.");
    this.continueButton = continueButton;
    const promptElement = root.querySelector<HTMLElement>("[data-intro-prompt]");
    if (!promptElement) throw new Error("Missing intro prompt.");
    this.promptElement = promptElement;
    this.motion = createSceneMotion(root, "intro");
    const loader = root.querySelector<HTMLElement>(".intro-loader");
    if (loader && !prefersReducedMotion()) {
      this.loadingTween = gsap.to(loader, {
        duration: 0.8,
        ease: "none",
        repeat: -1,
        rotation: 360,
      });
    }
    this.continueButton.addEventListener("click", this.finish);
    document.addEventListener("keydown", this.handleKeyDown);
    void this.prepare(prompt);
  }

  private async prepare(prompt: string): Promise<void> {
    await Promise.all([
      Promise.race([
        adsManager.initialize(),
        wait(gameIntroSceneConfig.maximumAdsWait),
      ]),
      wait(gameIntroSceneConfig.minimumLoading),
    ]);
    if (this.destroyed) return;
    this.loadingTween?.kill();
    this.loadingTween = null;
    this.promptElement.textContent = prompt;
    this.continueButton.disabled = false;
    this.continueButton.setAttribute("aria-busy", "false");
    this.continueButton.setAttribute("aria-label", prompt);
    this.ready = true;
    this.continueButton.focus({ preventScroll: true });
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.ready) return;
    if (event.repeat || ["Alt", "Control", "Meta", "Shift"].includes(event.key)) return;
    event.preventDefault();
    this.finish();
  };

  private finish = () => {
    if (!this.ready || this.completed) return;
    this.completed = true;
    if (appConfig.soundtrack.enabled) {
      soundManager.playSound(resolveAssetPath(appConfig.soundtrack.file), appConfig.soundtrack.loop, "music");
    }
    this.sceneManager.loadScene(MainMenuScene);
  };

  destroy(): void {
    this.destroyed = true;
    this.loadingTween?.kill();
    this.motion.revert();
    this.continueButton.removeEventListener("click", this.finish);
    document.removeEventListener("keydown", this.handleKeyDown);
    this.root.replaceChildren();
  }
}
