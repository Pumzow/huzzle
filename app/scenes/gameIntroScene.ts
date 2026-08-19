import { brandMarkup } from "../components/brand";
import { appConfig } from "../config/appConfig";

export class GameIntroScene {
  private timerId: number | null = null;
  private completed = false;
  private readonly skipButton: HTMLButtonElement;

  constructor(private readonly root: HTMLElement, private readonly onComplete: () => void) {
    root.innerHTML = `<main class="scene-shell intro-scene" aria-label="Huzzle introduction">
      <button class="intro-skip" type="button">Skip</button>
      <div class="intro-center">
        ${brandMarkup("intro-brand")}
        <p class="intro-tagline">Swap · connect · complete</p>
      </div>
      <a class="image-credit" href="https://www.pexels.com" target="_blank" rel="noreferrer">Images provided by Pexels</a>
    </main>`;
    const skipButton = root.querySelector<HTMLButtonElement>(".intro-skip");
    if (!skipButton) throw new Error("Missing intro skip button.");
    this.skipButton = skipButton;
    this.skipButton.addEventListener("click", this.finish);
    document.addEventListener("keydown", this.handleKeyDown);
    this.timerId = window.setTimeout(this.finish, appConfig.intro.durationMs);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " " || event.key === "Escape") this.finish();
  };

  private finish = () => {
    if (this.completed) return;
    this.completed = true;
    this.onComplete();
  };

  destroy(): void {
    if (this.timerId !== null) window.clearTimeout(this.timerId);
    this.timerId = null;
    this.skipButton.removeEventListener("click", this.finish);
    document.removeEventListener("keydown", this.handleKeyDown);
    this.root.replaceChildren();
  }
}
