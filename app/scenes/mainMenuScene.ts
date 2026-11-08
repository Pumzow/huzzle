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
import { modeFromSwipe } from "../utils/modeSelector";

export function mainMenuMarkup(): string {
  return `<main class="shell menu-scene">
      <section class="menu-workspace">
        <div class="menu-decoration menu-decoration-one" aria-hidden="true"></div>
        <div class="menu-decoration menu-decoration-two" aria-hidden="true"></div>
        <section class="menu-card" aria-label="Huzzle main menu">
          <div class="menu-points" hidden><strong data-menu-points>0</strong></div>
          <div class="menu-actions">
            <button class="menu-action menu-play" type="button"><small class="menu-play-level" data-menu-level hidden></small><span class="menu-play-copy"><strong>Play</strong><small data-play-status hidden></small></span><b aria-hidden="true">→</b></button>
            <div class="menu-secondary-actions"><label class="menu-secondary-action menu-custom"><b aria-hidden="true">＋</b><span>Custom level</span><input type="file" accept="image/*"></label>${achievementsPanelMarkup()}</div>
          </div>
          <footer class="menu-card-footer"><div class="menu-context-panel">${howToPlayPanelMarkup()}${leaderboardPanelMarkup()}</div>${accountPanelMarkup()}</footer>
        </section>
        <div class="menu-mode-wheel" data-mode-wheel data-active-mode="casual" hidden>
          <div class="menu-mode-wheel-control" role="group" aria-label="Game mode">
            <div class="menu-mode-viewport" data-mode-carousel tabindex="0" aria-label="Choose game mode. Use the left and right arrow keys.">
              <div class="menu-mode-slot" data-mode-slot="casual"><button class="menu-mode-option" type="button" data-level-mode="casual" aria-pressed="false"><span>Casual</span></button></div>
              <div class="menu-mode-slot" data-mode-slot="challenge"><button class="menu-mode-option" type="button" data-level-mode="challenge" aria-pressed="false"><span>Challenge</span></button></div>
            </div>
          </div>
        </div>
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
  private readonly sceneElement: HTMLElement;
  private readonly modeWheel: HTMLElement;
  private readonly modeCarousel: HTMLElement;
  private readonly modeButtons: HTMLButtonElement[];
  private readonly playStatus: HTMLElement;
  private readonly level: HTMLElement;
  private readonly points: HTMLElement;
  private readonly motion: ReturnType<typeof createSceneMotion>;
  private preparedLevel: Promise<LoadedLevel | null> | null = null;
  private preparedLevelId: number | null = null;
  private menuPreparation: Promise<void> = Promise.resolve();
  private menuRequest = 0;
  private destroyed = false;
  private swipePointerId: number | null = null;
  private swipeStartX = 0;
  private swipeStartY = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly navigator: SceneNavigator
  ) {
    root.innerHTML = mainMenuMarkup();

    this.playButton = requiredElement<HTMLButtonElement>(root, ".menu-play");
    this.customInput =
      requiredElement<HTMLInputElement>(root, ".menu-custom input");
    this.level = requiredElement<HTMLElement>(root, "[data-menu-level]");
    this.points = requiredElement<HTMLElement>(root, ".menu-points");
    this.sceneElement = requiredElement(root, ".menu-scene");
    this.modeWheel = requiredElement(root, "[data-mode-wheel]");
    this.modeCarousel = requiredElement(root, "[data-mode-carousel]");
    this.modeButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-level-mode]"),
    );
    this.playStatus = requiredElement(root, "[data-play-status]");
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
    this.leaderboardPanel = new LeaderboardPanel(
      root,
      this.accountPanel.openForAuthentication,
    );
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
    this.modeCarousel.addEventListener("keydown", this.handleModeKeyDown);
    this.sceneElement.addEventListener("pointerdown", this.handleSwipeStart);
    this.sceneElement.addEventListener("pointerup", this.handleSwipeEnd);
    this.sceneElement.addEventListener("pointercancel", this.cancelSwipe);
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
        this.achievementsPanel.update(
          progress,
          offlineLevelStore.currentLevel,
        );
      });
      return;
    }

    const progress = await levelProgressStore.load();
    if (this.destroyed || request !== this.menuRequest) return;
    this.achievementsPanel.update(progress, offlineLevelStore.currentLevel);
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
    this.level.hidden = false;
    this.level.textContent = `Level ${offlineLevelStore.currentLevel + 1}`;
    this.points.hidden = true;
    this.setPlayAvailability(true);
    this.playButton.disabled = false;
  }

  private renderChallengeProgress(
    progress: PlayerProgress,
    available: boolean,
  ): void {
    this.level.hidden = false;
    this.level.textContent = `Level ${progress.currentLevel + 1}`;
    this.points.hidden = progress.totalPoints <= 0;
    this.points.classList.toggle("is-cheater", progress.isCheater);
    this.points.classList.remove("is-offline");
    if (!this.points.hidden)
      animateMenuPoints(this.points);
    const value = this.points.querySelector<HTMLElement>("[data-menu-points]");
    if (value)
      value.textContent = progress.isCheater
        ? "CHEAT AGAIN"
        : progress.totalPoints.toLocaleString();
    this.setPlayAvailability(
      available,
      window.navigator.onLine === false
        ? "Connect to the internet to play Challenge"
        : "Challenge levels are temporarily unavailable",
    );
    this.playButton.disabled = !available;
  }

  private setPlayAvailability(available: boolean, message = ""): void {
    this.playButton.classList.toggle("is-unavailable", !available);
    this.playStatus.hidden = available;
    this.playStatus.textContent = available ? "" : message;
  }

  private renderMode(revealWheel = false): void {
    const mode = levelModeStore.current;
    const unlocked = levelModeStore.challengeUnlocked;
    const selector = mainMenuSceneConfig.modeSelector;
    const waitingForUnlockNotice =
      selector.revealAfterChallengeUnlock &&
      levelModeStore.shouldShowChallengeUnlockNotice;
    const wheelVisible = selector.enabled && unlocked && !waitingForUnlockNotice;
    this.modeWheel.hidden = !wheelVisible;
    this.modeWheel.dataset.activeMode = mode;
    this.modeWheel.classList.toggle("is-revealing", wheelVisible && revealWheel);
    this.modeButtons.forEach((button) => {
      const buttonMode = button.dataset.levelMode as LevelMode;
      const selected = buttonMode === mode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = buttonMode === "challenge" && !unlocked;
    });
    this.howToPlayContainer.hidden = mode !== "casual";
    this.leaderboardContainer.hidden = mode !== "challenge";
  }

  private changeMode = (event: Event): void => {
    const button = event.currentTarget as HTMLButtonElement;
    const mode = button.dataset.levelMode as LevelMode;
    this.selectMode(mode);
  };

  private selectMode(mode: LevelMode): void {
    if (mode === levelModeStore.current) return;
    if (!levelModeStore.select(mode)) return;
    this.renderMode();
    this.menuPreparation = this.prepareMenu();
  }

  private handleModeKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    this.selectMode(event.key === "ArrowLeft" ? "casual" : "challenge");
  };

  private handleSwipeStart = (event: PointerEvent): void => {
    if (
      !mainMenuSceneConfig.modeSelector.swipeBackground ||
      this.modeWheel.hidden ||
      event.button !== 0
    ) return;
    const target = event.target as Element | null;
    if (target?.closest(".menu-card, .menu-mode-wheel, dialog, button, input, label, a"))
      return;
    this.swipePointerId = event.pointerId;
    this.swipeStartX = event.clientX;
    this.swipeStartY = event.clientY;
  };

  private handleSwipeEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.swipePointerId) return;
    const nextMode = modeFromSwipe(
      levelModeStore.current,
      event.clientX - this.swipeStartX,
      event.clientY - this.swipeStartY,
      mainMenuSceneConfig.modeSelector.swipeThresholdPx,
      mainMenuSceneConfig.modeSelector.horizontalIntentRatio,
    );
    this.cancelSwipe();
    if (nextMode) this.selectMode(nextMode);
  };

  private cancelSwipe = (): void => {
    this.swipePointerId = null;
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
    this.renderMode(true);
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
    this.modeCarousel.removeEventListener("keydown", this.handleModeKeyDown);
    this.sceneElement.removeEventListener("pointerdown", this.handleSwipeStart);
    this.sceneElement.removeEventListener("pointerup", this.handleSwipeEnd);
    this.sceneElement.removeEventListener("pointercancel", this.cancelSwipe);
    window.removeEventListener("online", this.handleConnectivityChange);
    window.removeEventListener("offline", this.handleConnectivityChange);
    this.root.replaceChildren();
  }
}
