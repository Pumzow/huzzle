import type { SceneNavigator } from "../types/sceneTypes";
import { AccountPanel, accountPanelMarkup } from "../components/panels/accountPanel";
import {
  AchievementsPanel,
  achievementsPanelMarkup,
} from "../components/panels/achievementsPanel";
import {
  LeaderboardPanel,
  leaderboardPanelMarkup,
} from "../components/panels/leaderboardPanel";
import {
  HowToPlayPanel,
  howToPlayPanelMarkup,
} from "../components/panels/howToPlayPanel";
import {
  ChallengeUnlockPanel,
  challengeUnlockPanelMarkup,
} from "../components/panels/challengeUnlockPanel";
import { levelProgressStore } from "../services/levelProgressStore";
import { offlineLevelStore } from "../services/offlineLevelStore";
import { levelModeStore } from "../services/levelModeStore";
import { appConfig } from "../config/appConfig";
import { puzzleSceneConfig } from "../config/scenes/puzzleSceneConfig";
import { mainMenuSceneConfig } from "../config/scenes/mainMenuSceneConfig";
import { levelPreloader } from "../systems/levelPreloader";
import type { LoadedLevel } from "../types/levelTypes";
import type { PlayerProgress } from "../types/progressTypes";
import { animateMenuPoints, createSceneMotion } from "../effects/sceneEffects";
import { requiredElement } from "../utils/dom";
import { eventDefinitions, gameEvents } from "../events/gameEvents";
import type { LevelMode } from "../types/levelModeTypes";
import { deviceCapabilities } from "../utils/deviceCapabilities";

export function mainMenuMarkup(): string {
  return `<main class="shell menu-scene">
      <section class="menu-workspace">
        <div class="menu-decoration menu-decoration-one" aria-hidden="true"></div>
        <div class="menu-decoration menu-decoration-two" aria-hidden="true"></div>
        <section class="menu-card" aria-label="Huzzle main menu">
          <div class="menu-mode-picker" role="group" aria-label="Game mode">
            <button class="menu-mode-option" type="button" data-level-mode="casual" aria-pressed="false">
              <span>Casual</span>
            </button>
            <button class="menu-mode-option" type="button" data-level-mode="challenge" aria-pressed="false">
              <span>Challenge</span><small data-challenge-mode-copy hidden></small><i data-challenge-mode-icon aria-hidden="true">◆</i>
            </button>
          </div>
          <p class="menu-mode-message" data-mode-message aria-live="polite"></p>
          <div class="menu-progress-card" hidden><strong data-menu-level></strong><div class="menu-points" hidden><strong data-menu-points>0</strong></div></div>
          <div class="menu-actions">
            <button class="menu-action menu-play" type="button"><span>Play</span><b aria-hidden="true">→</b></button>
            <div class="menu-secondary-actions"><label class="menu-secondary-action menu-custom"><b aria-hidden="true">＋</b><span>Custom level</span><input type="file" accept="image/*"></label>${achievementsPanelMarkup()}</div>
          </div>
          <footer class="menu-card-footer"><div class="menu-context-panel">${howToPlayPanelMarkup()}${leaderboardPanelMarkup()}</div>${accountPanelMarkup()}</footer>
        </section>
      </section>
      ${challengeUnlockPanelMarkup()}
    </main>`;
}

export class MainMenuScene {
  static readonly sceneConfig = mainMenuSceneConfig;

  private readonly playButton: HTMLButtonElement;
  private readonly customInput: HTMLInputElement;
  private readonly accountPanel: AccountPanel;
  private readonly achievementsPanel: AchievementsPanel;
  private readonly leaderboardPanel: LeaderboardPanel;
  private readonly howToPlayPanel: HowToPlayPanel;
  private readonly challengeUnlockPanel: ChallengeUnlockPanel;
  private readonly howToPlayContainer: HTMLElement;
  private readonly leaderboardContainer: HTMLElement;
  private readonly modeButtons: HTMLButtonElement[];
  private readonly challengeModeCopy: HTMLElement;
  private readonly challengeModeIcon: HTMLElement;
  private readonly modeMessage: HTMLElement;
  private readonly progressCard: HTMLElement;
  private readonly level: HTMLElement;
  private readonly points: HTMLElement;
  private readonly motion: ReturnType<typeof createSceneMotion>;
  private preparedLevel: Promise<LoadedLevel | null> | null = null;
  private preparedLevelId: number | null = null;
  private menuPreparation: Promise<void> = Promise.resolve();
  private menuRequest = 0;
  private destroyed = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly navigator: SceneNavigator
  ) {
    root.innerHTML = mainMenuMarkup();

    this.playButton = requiredElement<HTMLButtonElement>(root, ".menu-play");
    this.customInput =
      requiredElement<HTMLInputElement>(root, ".menu-custom input");
    this.progressCard = requiredElement<HTMLElement>(root, ".menu-progress-card");
    this.level = requiredElement<HTMLElement>(root, "[data-menu-level]");
    this.points = requiredElement<HTMLElement>(root, ".menu-points");
    this.modeButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-level-mode]"),
    );
    this.challengeModeCopy = requiredElement(
      root,
      "[data-challenge-mode-copy]",
    );
    this.challengeModeIcon = requiredElement(
      root,
      "[data-challenge-mode-icon]",
    );
    this.modeMessage = requiredElement(root, "[data-mode-message]");
    this.howToPlayContainer = requiredElement(root, ".how-to-play-panel");
    this.leaderboardContainer = requiredElement(root, ".leaderboard-panel");
    this.motion = createSceneMotion(root, "menu");
    this.accountPanel = new AccountPanel(root, () => {
      this.menuPreparation = this.prepareMenu();
      if (levelModeStore.current === "challenge") {
        this.leaderboardPanel.open();
      }
    });
    this.achievementsPanel = new AchievementsPanel(root);
    this.leaderboardPanel = new LeaderboardPanel(root, this.accountPanel.open);
    this.howToPlayPanel = new HowToPlayPanel(
      root,
      deviceCapabilities.uiPlatform,
      this.showChallengeUnlockNotice,
    );
    this.challengeUnlockPanel = new ChallengeUnlockPanel(
      root,
      this.dismissChallengeUnlock,
    );
    this.playButton.addEventListener("click", this.playPuzzle);
    this.customInput.addEventListener("change", this.handleCustomLevel);
    this.modeButtons.forEach((button) =>
      button.addEventListener("click", this.changeMode),
    );
    window.addEventListener("online", this.handleConnectivityChange);
    window.addEventListener("offline", this.handleConnectivityChange);
    this.renderMode();
    this.menuPreparation = this.prepareMenu();
    requestAnimationFrame(this.showInitialPanel);
  }

  private playPuzzle = async () => {
    this.playButton.disabled = true;
    await this.menuPreparation;
    if (this.destroyed) return;
    const mode = levelModeStore.current;
    if (mode === "casual") {
      gameEvents.emit(eventDefinitions.StartGame);
      try {
        await this.navigator.navigateWhenReady("puzzle", {
          mode,
          offlineLevelIndex: offlineLevelStore.currentLevel,
        });
      } catch {
        if (!this.destroyed) this.playButton.disabled = false;
      }
      return;
    }

    const level = await this.preparedLevel;
    if (!level) {
      this.playButton.disabled = false;
      return;
    }
    gameEvents.emit(eventDefinitions.StartGame);
    try {
      await this.navigator.navigateWhenReady("puzzle", {
        mode,
        currentLevelId: this.preparedLevelId ?? level.id,
        preparedLevel: level,
      });
    } catch {
      if (!this.destroyed) this.playButton.disabled = false;
    }
  };

  private handleCustomLevel = () => {
    const file = this.customInput.files?.[0];
    if (!file) return;
    void this.navigator.navigateWhenReady("customPuzzle", file);
  };

  private async prepareMenu(): Promise<void> {
    const request = ++this.menuRequest;
    this.playButton.disabled = true;
    if (levelModeStore.current === "casual") {
      this.preparedLevel = null;
      this.preparedLevelId = null;
      this.renderCasualProgress();
      void levelProgressStore.load().then((progress) => {
        if (this.destroyed || request !== this.menuRequest) return;
        this.achievementsPanel.update(progress);
      });
      return;
    }

    const progress = await levelProgressStore.load();
    if (this.destroyed || request !== this.menuRequest) return;
    this.achievementsPanel.update(progress);
    this.preparedLevelId = progress.currentLevel;
    const forcedOffline = offlineLevelStore.isDebugForced;
    const disconnected = window.navigator.onLine === false;
    this.preparedLevel = forcedOffline || disconnected
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
    this.renderChallengeProgress(progress, level !== null);
  }

  private renderCasualProgress(): void {
    this.progressCard.hidden = false;
    this.level.hidden = false;
    this.level.textContent = `Casual level ${offlineLevelStore.currentLevel + 1}`;
    this.points.hidden = true;
    this.modeMessage.textContent = "";
    this.playButton.disabled = false;
  }

  private renderChallengeProgress(
    progress: PlayerProgress,
    available: boolean,
  ): void {
    const hideProgress = progress.currentLevel === 0;
    this.progressCard.hidden = hideProgress;
    this.level.hidden = false;
    this.level.textContent = `Challenge level ${progress.currentLevel + 1}`;
    this.points.hidden = hideProgress;
    this.points.classList.toggle("is-cheater", progress.isCheater);
    this.points.classList.remove("is-offline");
    if (progress.isCheater || progress.totalPoints > 0)
      animateMenuPoints(this.points);
    const value = this.points.querySelector<HTMLElement>("[data-menu-points]");
    if (value)
      value.textContent = progress.isCheater
        ? "CHEAT AGAIN"
        : progress.totalPoints.toLocaleString();
    this.modeMessage.textContent = available
      ? ""
      : window.navigator.onLine === false
        ? "Connect to the internet to play Challenge"
        : "Challenge levels are temporarily unavailable";
    this.playButton.disabled = !available;
  }

  private renderMode(): void {
    const mode = levelModeStore.current;
    const unlocked = levelModeStore.challengeUnlocked;
    this.modeButtons.forEach((button) => {
      const buttonMode = button.dataset.levelMode as LevelMode;
      const selected = buttonMode === mode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = buttonMode === "challenge" && !unlocked;
    });
    this.challengeModeCopy.hidden = unlocked;
    this.challengeModeCopy.textContent = unlocked
      ? ""
      : `Complete ${levelModeStore.challengeUnlockProgress} / ${levelModeStore.requiredCasualLevels} Casual levels`;
    this.challengeModeIcon.textContent = unlocked ? "◆" : "🔒";
    this.howToPlayContainer.hidden = mode !== "casual";
    this.leaderboardContainer.hidden = mode !== "challenge";
  }

  private changeMode = (event: Event): void => {
    const button = event.currentTarget as HTMLButtonElement;
    const mode = button.dataset.levelMode as LevelMode;
    if (!levelModeStore.select(mode)) return;
    this.renderMode();
    this.menuPreparation = this.prepareMenu();
  };

  private showInitialPanel = (): void => {
    if (this.destroyed) return;
    if (!levelModeStore.hasSeenHowToPlay) {
      levelModeStore.markHowToPlaySeen();
      this.howToPlayPanel.open();
      return;
    }
    this.showChallengeUnlockNotice();
  };

  private showChallengeUnlockNotice = (): void => {
    if (this.destroyed || !levelModeStore.shouldShowChallengeUnlockNotice)
      return;
    this.challengeUnlockPanel.open();
  };

  private dismissChallengeUnlock = (): void => {
    levelModeStore.markChallengeUnlockNoticeSeen();
  };

  private handleConnectivityChange = () => {
    this.menuPreparation = this.prepareMenu();
  };

  onDebugProgressChanged(): void {
    this.menuPreparation = this.prepareMenu();
  }

  onDebugOfflineModeChanged(): void {
    this.renderMode();
    this.menuPreparation = this.prepareMenu();
  }

  onDebugDeviceProfileChanged(): void {
    this.navigator.refreshHeader();
    this.howToPlayPanel.updatePlatform(deviceCapabilities.uiPlatform);
    this.menuPreparation = this.prepareMenu();
  }

  destroy(): void {
    this.destroyed = true;
    this.motion.revert();
    this.accountPanel.destroy();
    this.achievementsPanel.destroy();
    this.leaderboardPanel.destroy();
    this.howToPlayPanel.destroy();
    this.challengeUnlockPanel.destroy();
    this.playButton.removeEventListener("click", this.playPuzzle);
    this.customInput.removeEventListener("change", this.handleCustomLevel);
    this.modeButtons.forEach((button) =>
      button.removeEventListener("click", this.changeMode),
    );
    window.removeEventListener("online", this.handleConnectivityChange);
    window.removeEventListener("offline", this.handleConnectivityChange);
    this.root.replaceChildren();
  }
}
