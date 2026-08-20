import { brandMarkup } from "../components/brand";
import { appConfig, resolveAssetPath } from "../config/appConfig";
import { gameIntroSceneConfig } from "../config/scenes/gameIntroSceneConfig";
import { MainMenuScene } from "./mainMenuScene";
import type { SceneManager } from "../systems/sceneManager";
import { soundManager } from "../systems/soundManager";

export class GameIntroScene {
  static readonly sceneName = "gameIntro";

  private completed = false;
  private readonly continueButton: HTMLButtonElement;

  constructor(private readonly root: HTMLElement, private readonly sceneManager: SceneManager) {
    const usesTouch = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    const prompt = usesTouch ? gameIntroSceneConfig.touchPrompt : gameIntroSceneConfig.pointerPrompt;
    root.innerHTML = `<main class="scene-shell intro-scene" aria-label="Huzzle introduction">
      <button class="intro-continue" type="button" aria-label="${prompt}">
        <span class="intro-center">
          ${brandMarkup("intro-brand", "span")}
          <span class="intro-tagline">Swap · connect · complete</span>
          <span class="intro-prompt">${prompt}</span>
        </span>
      </button>
      <a class="image-credit" href="https://www.pexels.com" target="_blank" rel="noreferrer">Images provided by Pexels</a>
    </main>`;
    const continueButton = root.querySelector<HTMLButtonElement>(".intro-continue");
    if (!continueButton) throw new Error("Missing intro continue button.");
    this.continueButton = continueButton;
    this.continueButton.addEventListener("click", this.finish);
    document.addEventListener("keydown", this.handleKeyDown);
    this.continueButton.focus({ preventScroll: true });
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || ["Alt", "Control", "Meta", "Shift"].includes(event.key)) return;
    event.preventDefault();
    this.finish();
  };

  private finish = () => {
    if (this.completed) return;
    this.completed = true;
    if (appConfig.soundtrack.enabled) {
      soundManager.playSound(resolveAssetPath(appConfig.soundtrack.file), appConfig.soundtrack.loop, "music");
    }
    this.sceneManager.loadScene(MainMenuScene);
  };

  destroy(): void {
    this.continueButton.removeEventListener("click", this.finish);
    document.removeEventListener("keydown", this.handleKeyDown);
    this.root.replaceChildren();
  }
}
