import { brandMarkup } from "../components/brand";
import { CustomPuzzleScene } from "./customPuzzleScene";
import { PuzzleScene } from "./puzzleScene";
import type { SceneManager } from "../systems/sceneManager";
import { SoundChannel, soundManager } from "../systems/soundManager";
import { AccountPanel, accountPanelMarkup } from "../components/accountPanel";
import { LeaderboardPanel, leaderboardPanelMarkup } from "../components/leaderboardPanel";
import { levelProgressStore } from "../services/levelProgressStore";
import { renderThemeToggle } from "../components/appHeader";
import { themeManager } from "../systems/themeManager";
import { appConfig } from "../config/appConfig";
import { puzzleSceneConfig } from "../config/scenes/puzzleSceneConfig";
import { levelPreloader } from "../systems/levelPreloader";
import type { LoadedLevel } from "../systems/levelService";

function audioIcon(channel: SoundChannel, muted: boolean): string {
  if (channel === "music") {
    return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>${muted ? '<path d="m3 3 18 18"/>' : ""}</svg>`;
  }
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z"/>${muted ? '<path d="m16 9 5 6M21 9l-5 6"/>' : '<path d="M15 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>'}</svg>`;
}

export class MainMenuScene {
  static readonly sceneName = "mainMenu";

  private readonly playButton: HTMLButtonElement;
  private readonly customInput: HTMLInputElement;
  private readonly musicButton: HTMLButtonElement;
  private readonly sfxButton: HTMLButtonElement;
  private readonly themeButton: HTMLButtonElement;
  private readonly accountPanel: AccountPanel;
  private readonly leaderboardPanel: LeaderboardPanel;
  private readonly points: HTMLElement;
  private preparedLevel: Promise<LoadedLevel | null> | null = null;
  private preparedLevelId: number | null = null;
  private menuPreparation: Promise<void> = Promise.resolve();
  private menuRequest = 0;
  private destroyed = false;

  constructor(private readonly root: HTMLElement, private readonly sceneManager: SceneManager) {
    root.innerHTML = `<main class="scene-shell menu-scene">
      <div class="menu-decoration menu-decoration-one" aria-hidden="true"></div>
      <div class="menu-decoration menu-decoration-two" aria-hidden="true"></div>
      <section class="menu-card" aria-label="Huzzle main menu">
        <div class="menu-card-top">${brandMarkup("menu-brand")}<div class="menu-platform-panels">${leaderboardPanelMarkup()}${accountPanelMarkup()}</div></div>
        <div class="menu-points" hidden><strong data-menu-points>0</strong></div>
        <div class="menu-actions">
          <button class="menu-action menu-play" type="button"><span>Play</span><b aria-hidden="true">→</b></button>
          <label class="menu-action menu-custom"><span>Custom Level</span><b aria-hidden="true">＋</b><input type="file" accept="image/*"></label>
        </div>
        <div class="menu-audio" aria-label="Game preferences">
          <button class="menu-audio-button music-mute" type="button"></button>
          <button class="menu-audio-button sfx-mute" type="button"></button>
          <button class="menu-audio-button menu-theme-toggle" type="button"></button>
        </div>
      </section>
    </main>`;

    this.playButton = this.requireElement<HTMLButtonElement>(".menu-play");
    this.customInput = this.requireElement<HTMLInputElement>(".menu-custom input");
    this.musicButton = this.requireElement<HTMLButtonElement>(".music-mute");
    this.sfxButton = this.requireElement<HTMLButtonElement>(".sfx-mute");
    this.themeButton = this.requireElement<HTMLButtonElement>(".menu-theme-toggle");
    this.points = this.requireElement<HTMLElement>(".menu-points");
    this.accountPanel = new AccountPanel(root, () => {
      this.menuPreparation = this.renderPoints();
      this.leaderboardPanel.open();
    });
    this.leaderboardPanel = new LeaderboardPanel(root, this.accountPanel.open);
    this.playButton.addEventListener("click", this.playPuzzle);
    this.customInput.addEventListener("change", this.handleCustomLevel);
    this.musicButton.addEventListener("click", this.toggleMusic);
    this.sfxButton.addEventListener("click", this.toggleSfx);
    this.themeButton.addEventListener("click", this.toggleTheme);
    this.renderAudioButtons();
    this.renderThemeButton();
    this.menuPreparation = this.renderPoints();
  }

  private playPuzzle = async () => {
    this.playButton.disabled = true;
    await this.menuPreparation;
    const level = await this.preparedLevel;
    if (this.destroyed) return;
    try {
      await this.sceneManager.loadSceneWhenReady(PuzzleScene, level ? {
        currentLevelId: level.id,
        preparedLevel: level,
      } : {
        currentLevelId: this.preparedLevelId ?? undefined,
        skipLevelLoad: true,
      });
    } catch {
      if (!this.destroyed) this.playButton.disabled = false;
    }
  };

  private requireElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing main menu element: ${selector}`);
    return element;
  }

  private handleCustomLevel = () => {
    const file = this.customInput.files?.[0];
    if (!file) return;
    void this.sceneManager.loadSceneWhenReady(CustomPuzzleScene, file);
  };

  private toggleMusic = () => {
    soundManager.toggleMuted("music");
    this.renderAudioButtons();
  };

  private toggleSfx = () => {
    soundManager.toggleMuted("sfx");
    this.renderAudioButtons();
  };

  private toggleTheme = () => {
    themeManager.toggle();
    this.renderThemeButton();
  };

  private renderThemeButton(): void {
    renderThemeToggle(this.themeButton, themeManager.current);
    const label = this.themeButton.querySelector("span");
    if (label) label.textContent = "Theme";
    const mode = document.createElement("small");
    mode.textContent = themeManager.current === "light" ? "Light" : "Dark";
    this.themeButton.append(mode);
  }

  private renderAudioButton(button: HTMLButtonElement, channel: SoundChannel, label: string): void {
    const muted = soundManager.isMuted(channel);
    button.setAttribute("aria-label", `${muted ? "Unmute" : "Mute"} ${label.toLowerCase()}`);
    button.setAttribute("aria-pressed", String(muted));
    button.innerHTML = `${audioIcon(channel, muted)}<span>${label}</span><small>${muted ? "Off" : "On"}</small>`;
  }

  private renderAudioButtons(): void {
    this.renderAudioButton(this.musicButton, "music", "Music");
    this.renderAudioButton(this.sfxButton, "sfx", "SFX");
  }

  private async renderPoints(): Promise<void> {
    const request = ++this.menuRequest;
    const progress = await levelProgressStore.load();
    if (this.destroyed || request !== this.menuRequest) return;
    this.points.hidden = progress.points <= 0;
    const value = this.points.querySelector<HTMLElement>("[data-menu-points]");
    if (value) value.textContent = progress.points.toLocaleString();
    this.preparedLevelId = progress.currentLevel;
    this.preparedLevel = levelPreloader.preload(
      appConfig.levels.manifestUrl,
      {
        mode: puzzleSceneConfig.levels.selectionMode,
        currentLevelId: progress.currentLevel,
      },
      puzzleSceneConfig.levels.requestTimeoutMs,
    ).catch(() => null);
  }

  destroy(): void {
    this.destroyed = true;
    this.accountPanel.destroy();
    this.leaderboardPanel.destroy();
    this.playButton.removeEventListener("click", this.playPuzzle);
    this.customInput.removeEventListener("change", this.handleCustomLevel);
    this.musicButton.removeEventListener("click", this.toggleMusic);
    this.sfxButton.removeEventListener("click", this.toggleSfx);
    this.themeButton.removeEventListener("click", this.toggleTheme);
    this.root.replaceChildren();
  }
}
