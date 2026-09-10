import { brandMarkup } from "../components/common/brand";
import {
  PreferencesControls,
  preferencesControlsMarkup,
} from "../components/common/preferencesControls";
import type { SceneNavigator } from "../types/sceneTypes";
import { AccountPanel, accountPanelMarkup } from "../components/panels/accountPanel";
import {
  LeaderboardPanel,
  leaderboardPanelMarkup,
} from "../components/panels/leaderboardPanel";
import { levelProgressStore } from "../services/levelProgressStore";
import { offlineLevelStore } from "../services/offlineLevelStore";
import { appConfig } from "../config/appConfig";
import { puzzleSceneConfig } from "../config/scenes/puzzleSceneConfig";
import { mainMenuSceneConfig } from "../config/scenes/mainMenuSceneConfig";
import { levelPreloader } from "../systems/levelPreloader";
import type { LoadedLevel } from "../types/levelTypes";
import type { PlayerProgress } from "../types/progressTypes";
import { animateMenuPoints, createSceneMotion } from "../effects/sceneEffects";
import { requiredElement } from "../utils/dom";

export class MainMenuScene {
  static readonly sceneConfig = mainMenuSceneConfig;

  private readonly playButton: HTMLButtonElement;
  private readonly customInput: HTMLInputElement;
  private readonly preferences: PreferencesControls;
  private readonly accountPanel: AccountPanel;
  private readonly leaderboardPanel: LeaderboardPanel;
  private readonly points: HTMLElement;
  private readonly motion: ReturnType<typeof createSceneMotion>;
  private preparedLevel: Promise<LoadedLevel | null> | null = null;
  private preparedLevelId: number | null = null;
  private menuPreparation: Promise<void> = Promise.resolve();
  private menuRequest = 0;
  private destroyed = false;
  private lastProgress: PlayerProgress | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly navigator: SceneNavigator
  ) {
    root.innerHTML = `<main class="scene-shell menu-scene">
      <div class="menu-decoration menu-decoration-one" aria-hidden="true"></div>
      <div class="menu-decoration menu-decoration-two" aria-hidden="true"></div>
      <section class="menu-card" aria-label="Huzzle main menu">
        <div class="menu-card-top">${brandMarkup(
          "menu-brand"
        )}<div class="menu-platform-panels">${leaderboardPanelMarkup()}${accountPanelMarkup()}</div></div>
        <div class="menu-points" hidden><strong data-menu-points>0</strong></div>
        <div class="menu-actions">
          <button class="menu-action menu-play" type="button"><span>Play</span><b aria-hidden="true">→</b></button>
          <label class="menu-action menu-custom"><span>Custom Level</span><b aria-hidden="true">＋</b><input type="file" accept="image/*"></label>
        </div>
        ${preferencesControlsMarkup("menu")}
      </section>
    </main>`;

    this.playButton = requiredElement<HTMLButtonElement>(root, ".menu-play");
    this.customInput =
      requiredElement<HTMLInputElement>(root, ".menu-custom input");
    this.points = requiredElement<HTMLElement>(root, ".menu-points");
    this.motion = createSceneMotion(root, "menu");
    this.preferences = new PreferencesControls(root, "menu");
    this.accountPanel = new AccountPanel(root, () => {
      this.menuPreparation = this.renderPoints();
      this.leaderboardPanel.open();
    });
    this.leaderboardPanel = new LeaderboardPanel(root, this.accountPanel.open);
    this.playButton.addEventListener("click", this.playPuzzle);
    this.customInput.addEventListener("change", this.handleCustomLevel);
    window.addEventListener("online", this.handleConnectivityChange);
    window.addEventListener("offline", this.handleConnectivityChange);
    this.menuPreparation = this.renderPoints();
  }

  private playPuzzle = async () => {
    this.playButton.disabled = true;
    await this.menuPreparation;
    const level = await this.preparedLevel;
    if (this.destroyed) return;
    try {
      await this.navigator.navigateWhenReady(
        "puzzle",
        level
          ? {
              currentLevelId: level.id,
              preparedLevel: level,
            }
          : {
              currentLevelId: this.preparedLevelId ?? undefined,
              offlineLevelIndex: offlineLevelStore.currentLevel,
            }
      );
    } catch {
      if (!this.destroyed) this.playButton.disabled = false;
    }
  };

  private handleCustomLevel = () => {
    const file = this.customInput.files?.[0];
    if (!file) return;
    void this.navigator.navigateWhenReady("customPuzzle", file);
  };

  private async renderPoints(): Promise<void> {
    const request = ++this.menuRequest;
    const progress = await levelProgressStore.load();
    if (this.destroyed || request !== this.menuRequest) return;
    this.lastProgress = progress;
    this.preparedLevelId = progress.currentLevel;
    const forcedOffline = offlineLevelStore.isDebugForced;
    if (forcedOffline || window.navigator.onLine === false) this.renderProgressStatus(progress, true);
    this.preparedLevel = forcedOffline
      ? Promise.resolve(null)
      : levelPreloader
          .preload(
            appConfig.levels.manifestUrl,
            {
              mode: puzzleSceneConfig.levels.selectionMode,
              currentLevelId: progress.currentLevel,
            },
            puzzleSceneConfig.levels.requestTimeout,
          )
          .catch(() => null);
    const level = await this.preparedLevel;
    if (this.destroyed || request !== this.menuRequest) return;
    this.renderProgressStatus(progress, level === null);
  }

  private renderProgressStatus(progress: PlayerProgress, offline: boolean): void {
    this.points.hidden = !offline && !progress.isCheater && progress.points <= 0;
    this.points.classList.toggle("is-cheater", progress.isCheater);
    this.points.classList.toggle("is-offline", offline);
    if (offline || progress.isCheater || progress.points > 0) animateMenuPoints(this.points);
    const value = this.points.querySelector<HTMLElement>("[data-menu-points]");
    if (value)
      value.textContent = offline
        ? "OFFLINE"
        : progress.isCheater
        ? "CHEAT AGAIN"
        : progress.points.toLocaleString();
  }

  private handleConnectivityChange = () => {
    if (window.navigator.onLine === false && this.lastProgress) {
      this.renderProgressStatus(this.lastProgress, true);
    }
    this.menuPreparation = this.renderPoints();
  };

  onDebugProgressChanged(): void {
    this.menuPreparation = this.renderPoints();
  }

  onDebugOfflineModeChanged(): void {
    this.menuPreparation = this.renderPoints();
  }

  destroy(): void {
    this.destroyed = true;
    this.motion.revert();
    this.preferences.destroy();
    this.accountPanel.destroy();
    this.leaderboardPanel.destroy();
    this.playButton.removeEventListener("click", this.playPuzzle);
    this.customInput.removeEventListener("change", this.handleCustomLevel);
    window.removeEventListener("online", this.handleConnectivityChange);
    window.removeEventListener("offline", this.handleConnectivityChange);
    this.root.replaceChildren();
  }
}
