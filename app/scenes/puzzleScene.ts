import { AppHeader, appHeaderMarkup } from "../components/appHeader";
import {
  CompletionModal,
  completionModalMarkup,
} from "../components/puzzle/completionModal";
import { PuzzleBoard } from "../components/puzzle/puzzleBoard";
import {
  PuzzleControls,
  puzzleControlsMarkup,
} from "../components/puzzle/puzzleControls";
import { PuzzleHUD, puzzleHUDMarkup } from "../components/puzzle/puzzleHUD";
import {
  TargetHint,
  targetHintButtonMarkup,
  targetHintOverlayMarkup,
} from "../components/puzzle/targetHint";
import { gameConfig } from "../config/gameConfig";
import { appConfig } from "../config/appConfig";
import { puzzleSceneConfig } from "../config/scenes/puzzleSceneConfig";
import { createSampleImage } from "../systems/imageProcessor";
import { type LoadedLevel, type LevelSelectionMode } from "../systems/levelService";
import { levelPreloader } from "../systems/levelPreloader";
import { levelDesignFor, randomForLevel } from "../systems/levelDesign";
import { huzzle } from "drygon-huzzle-rules";

import { levelProgressStore } from "../services/levelProgressStore";
import { levelAttemptStore, type LevelAttemptSnapshot } from "../services/levelAttemptStore";
import type { SceneManager } from "../systems/sceneManager";
import { GridSize, PuzzleProgress, PuzzleScoringConfig, TileShape, TileShapeTypes } from "../types/gameTypes";
import { Utils } from "../utils/utils";
import { MainMenuScene } from "./mainMenuScene";

type PuzzleSceneOptions = {
  initialImageFile?: File;
  currentLevelId?: number;
  preparedLevel?: LoadedLevel;
  skipLevelLoad?: boolean;
};

export type PuzzleSceneConfig = {
  enabledShapes: readonly TileShape[];
  scoring: PuzzleScoringConfig;
  levels?: {
    requestTimeout: number;
    selectionMode: LevelSelectionMode;
    gridSizeSequence: readonly GridSize[];
    useLevelIdSeed: boolean;
  };
  components: {
    header: { enabled: boolean };
    board: { enabled: boolean };
    hud: {
      enabled: boolean;
      showMoves: boolean;
      showTimer: boolean;
      showStars: boolean;
    };
    controls: {
      enabled: boolean;
      allowImageUpload: boolean;
      allowShapeSelection: boolean;
      allowGridSelection: boolean;
      allowRestart: boolean;
    };
    targetHint: {
      enabled: boolean;
      allowUse: boolean;
    };
    completionModal: {
      enabled: boolean;
      allowNextLevel: boolean;
      allowShuffle: boolean;
    };
  };
};

function emptyProgress(gridSize: GridSize): PuzzleProgress {
  return {
    slots: [],
    moves: 0,
    groups: gridSize * gridSize,
    won: false,
    startingGroups: 0,
    moveLimit: 0,
  };
}

function requiredElement<T extends Element>(
  root: ParentNode,
  selector: string
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing application element: ${selector}`);
  return element;
}

export class PuzzleScene {
  static readonly sceneName: string = "puzzle";

  private imageUrl = createSampleImage();
  private levelId: number | null = null;
  private gridSize = gameConfig.grid.defaultSize;
  private tileShape = gameConfig.pieces.defaultShape;
  private pendingGridSize = this.gridSize;
  private pendingTileShape = this.tileShape;
  private pendingImageFile: File | null = null;
  private progress = emptyProgress(this.gridSize);
  private elapsedSeconds = 0;
  private gameStarted = false;
  private targetHintUsed = false;
  private targetHintVisible = false;
  private objectUrl: string | null = null;
  private timerStartedAt: number | null = null;
  private timerId: number | null = null;
  private board: PuzzleBoard | null = null;
  private header: AppHeader | null = null;
  private hud: PuzzleHUD | null = null;
  private controls: PuzzleControls | null = null;
  private targetHint: TargetHint | null = null;
  private completionModal: CompletionModal | null = null;
  private completionSave: Promise<void> | null = null;
  private nextLevelPreload: Promise<LoadedLevel | null> | null = null;
  private restoredAttempt: LevelAttemptSnapshot | null = null;
  private pointsAwarded = 0;
  private isCheater = false;
  private destroyed = false;
  private readyResolved = false;
  private readonly canvasHost: HTMLDivElement | null;
  private readonly canvasWrap: HTMLElement | null;
  private readonly workspace: HTMLElement;
  private readonly puzzleColumn: HTMLElement;
  private readonly settingsDialog: HTMLDialogElement | null;
  private readonly settingsButton: HTMLButtonElement | null;
  private readonly settingsCloseButton: HTMLButtonElement | null;
  private readonly workspaceResizeObserver: ResizeObserver;
  private readonly levelLabel: HTMLElement;
  private readonly config: PuzzleSceneConfig;
  readonly ready: Promise<void>;
  private resolveReady: () => void = () => undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly sceneManager: SceneManager,
    private readonly options: PuzzleSceneOptions = {}
  ) {
    this.ready = new Promise((resolve) => { this.resolveReady = resolve; });
    this.config = this.getConfig();
    const initialLevelId = options.preparedLevel?.id ?? options.currentLevelId;
    if (initialLevelId !== undefined) this.applyLevelDesign(initialLevelId);
    if (options.initialImageFile) {
      this.objectUrl = URL.createObjectURL(options.initialImageFile);
      this.imageUrl = this.objectUrl;
    }
    root.innerHTML = this.markup();
    this.levelLabel = requiredElement<HTMLElement>(root, "[data-level-label]");
    this.workspace = requiredElement<HTMLElement>(root, ".workspace");
    this.puzzleColumn = requiredElement<HTMLElement>(root, ".puzzle-column");
    const components = this.config.components;
    this.canvasHost = components.board.enabled
      ? requiredElement<HTMLDivElement>(root, ".canvas-host")
      : null;
    this.canvasWrap = components.board.enabled
      ? requiredElement<HTMLElement>(root, ".canvas-wrap")
      : null;
    this.settingsDialog = root.querySelector<HTMLDialogElement>(".puzzle-settings-dialog");
    this.settingsButton = root.querySelector<HTMLButtonElement>("[data-settings-open]");
    this.settingsCloseButton = root.querySelector<HTMLButtonElement>("[data-settings-close]");
    this.workspaceResizeObserver = new ResizeObserver(this.layoutPuzzleColumn);
    this.workspaceResizeObserver.observe(this.workspace);
    this.updateBoardAspect();

    if (components.header.enabled)
      this.header = new AppHeader(root, this.returnToMainMenu);
    if (components.hud.enabled) this.hud = new PuzzleHUD(root, components.hud);
    if (components.controls.enabled) {
      this.controls = new PuzzleControls(root, { ...components.controls, enabledShapes: this.config.enabledShapes }, {
        onImageUpload: (file) => this.handleUpload(file),
        onShapeChange: (shape) => this.changeTileShape(shape),
        onGridChange: (size) => this.changeGridSize(size),
        onRestart: () => this.applySettingsAndShuffle(),
      });
      this.settingsButton?.addEventListener("click", this.openSettings);
      this.settingsCloseButton?.addEventListener("click", this.closeSettings);
      this.settingsDialog?.addEventListener("click", this.closeSettingsFromBackdrop);
    }
    if (components.board.enabled && components.targetHint.enabled) {
      this.targetHint = new TargetHint(
        root,
        () => this.showTargetHint(),
        () => this.hideTargetHint(),
      );
    }
    if (components.completionModal.enabled)
      this.completionModal = new CompletionModal(root, {
        onNextLevel: this.loadNextLevel,
        onShuffle: () => this.resetChallenge(),
      });

    this.updateComponents();
    void this.initializeBoard();
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
    requestAnimationFrame(this.layoutPuzzleColumn);
  }

  protected getConfig(): PuzzleSceneConfig {
    return puzzleSceneConfig;
  }

  private returnToMainMenu = () => {
    this.saveCurrentAttempt();
    return this.sceneManager.loadScene(MainMenuScene);
  };

  private loadNextLevel = async () => {
    if (!this.config.levels || !this.progress.won) return;
    const [, preparedLevel] = await Promise.all([
      this.completionSave,
      this.nextLevelPreload,
    ]);
    if (this.destroyed) return;
    await this.sceneManager.loadSceneWhenReady(PuzzleScene, preparedLevel ? {
      currentLevelId: preparedLevel.id,
      preparedLevel,
    } : {
      currentLevelId: this.levelId === null ? undefined : this.levelId + 1,
      skipLevelLoad: true,
    });
  };

  private async initializeBoard(): Promise<void> {
    const levels = this.config.levels;
    if (!this.options.initialImageFile && levels && !this.options.skipLevelLoad) {
      if (this.options.preparedLevel) {
        this.applyLevel(this.options.preparedLevel);
      } else {
        const storedProgress = await levelProgressStore.load();
        const currentLevelId = this.options.currentLevelId ?? storedProgress.currentLevel;
        this.renderLevelLabel(currentLevelId);
        try {
          const loadedLevel = await levelPreloader.take(
          appConfig.levels.manifestUrl,
          {
            mode: levels.selectionMode,
            currentLevelId,
          },
            levels.requestTimeout,
          );
          this.applyLevel(loadedLevel);
        } catch {
          // Keep the generated sample image as the offline/network fallback.
        }
      }
    }
    if (this.destroyed) return;
    this.updateComponents();
    this.createBoard();
  }

  private applyLevel(level: LoadedLevel): void {
    this.levelId = level.id;
    this.applyLevelDesign(level.id);
    this.restoreLevelAttempt();
    this.updateBoardAspect();
    this.renderLevelLabel(level.id);
    this.imageUrl = level.imageUrl;
  }

  private restoreLevelAttempt(): void {
    if (this.levelId === null) return;
    const attempt = levelAttemptStore.load(this.levelId, this.gridSize, this.tileShape);
    this.restoredAttempt = attempt;
    if (!attempt) return;
    this.progress = {
      slots: [...attempt.slots],
      moves: attempt.moves,
      groups: attempt.groups,
      won: false,
      startingGroups: attempt.startingGroups,
      moveLimit: attempt.moveLimit,
    };
    this.elapsedSeconds = attempt.elapsedSeconds;
    this.gameStarted = attempt.started;
    this.targetHintUsed = attempt.hintUsed;
    this.timerStartedAt = attempt.started
      ? Date.now() - attempt.elapsedSeconds * 1000
      : null;
  }

  private saveCurrentAttempt(): void {
    if (this.levelId === null || this.progress.won || this.progress.slots.length === 0) return;
    levelAttemptStore.save({
      version: 1,
      levelId: this.levelId,
      gridSize: this.gridSize,
      tileShape: this.tileShape,
      slots: [...this.progress.slots],
      moves: this.progress.moves,
      groups: this.progress.groups,
      startingGroups: this.progress.startingGroups,
      moveLimit: this.progress.moveLimit,
      started: this.gameStarted,
      elapsedSeconds: this.elapsedSeconds,
      hintUsed: this.targetHintUsed,
    });
  }

  private applyLevelDesign(levelId: number): void {
    const levels = this.config.levels;
    if (!levels) return;
    const design = levelDesignFor(levelId, {
      ...levels,
      enabledShapes: this.config.enabledShapes,
    });
    this.gridSize = design.gridSize;
    this.tileShape = design.tileShape;
    this.pendingGridSize = design.gridSize;
    this.pendingTileShape = design.tileShape;
  }

  private updateBoardAspect(): void {
    if (!this.canvasWrap) return;
    this.canvasWrap.dataset.tileShape = this.tileShape;
    this.canvasWrap.style.setProperty("--board-aspect", String(this.boardAspect));
    this.puzzleColumn?.setAttribute("data-tile-shape", this.tileShape);
    requestAnimationFrame(this.layoutPuzzleColumn);
  }

  private get boardAspect(): number {
    if (this.tileShape === "card") return 3 / 4;
    const staggeredSpan = .75 * this.gridSize + .25;
    const hexSpan = Math.sqrt(3) / 2 * (this.gridSize + .5);
    if (this.tileShape === "hexagon") return staggeredSpan / hexSpan;
    if (this.tileShape === "verticalHexagon") return hexSpan / staggeredSpan;
    return 1;
  }

  private layoutPuzzleColumn = (): void => {
    const toolbar = this.root.querySelector<HTMLElement>(".game-toolbar");
    const actions = this.root.querySelector<HTMLElement>(".board-actions");
    if (!toolbar || !actions) return;
    const actionsStyle = getComputedStyle(actions);
    const actionsHeight = actions.offsetHeight +
      Number.parseFloat(actionsStyle.marginTop) +
      Number.parseFloat(actionsStyle.marginBottom);
    const boardHeight = Math.max(0, this.workspace.clientHeight - actionsHeight - toolbar.offsetHeight);
    const desiredWidth = Math.ceil(boardHeight * this.boardAspect) + 2;
    this.puzzleColumn.style.width = `${Math.min(this.workspace.clientWidth, desiredWidth)}px`;
  };

  private openSettings = (): void => {
    if (!this.settingsDialog?.open) this.settingsDialog?.showModal();
  };

  private closeSettings = (): void => this.settingsDialog?.close();

  private closeSettingsFromBackdrop = (event: MouseEvent): void => {
    if (event.target === this.settingsDialog) this.closeSettings();
  };

  private markup(): string {
    const components = this.config.components;
    const header = components.header.enabled ? appHeaderMarkup(true) : "";
    const hud = components.hud.enabled ? puzzleHUDMarkup(components.hud) : "";
    const completion = components.completionModal.enabled
      ? completionModalMarkup(components.completionModal)
      : "";
    const hintEnabled = components.board.enabled && components.targetHint.enabled;
    const hintButton = hintEnabled ? targetHintButtonMarkup() : "";
    const hintOverlay = hintEnabled ? targetHintOverlayMarkup() : "";
    const board = components.board.enabled
      ? `<div class="canvas-wrap"><div class="canvas-host"></div>${hintOverlay}${completion}</div>`
      : "";
    const controls = components.controls.enabled
      ? puzzleControlsMarkup({ ...components.controls, enabledShapes: this.config.enabledShapes })
      : "";
    const settingsButton = controls
      ? `<button class="puzzle-settings-button" type="button" data-settings-open aria-haspopup="dialog">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>
          <strong>Settings</strong>
        </button>`
      : "";
    const settingsDialog = controls
      ? `<dialog class="puzzle-settings-dialog" aria-labelledby="puzzle-settings-title">
          <section class="puzzle-settings-card">
            <header><div><p>Custom puzzle</p><h2 id="puzzle-settings-title">Puzzle settings</h2></div><button type="button" data-settings-close aria-label="Close puzzle settings">×</button></header>
            <div class="puzzle-settings-controls">${controls}</div>
          </section>
        </dialog>`
      : "";

    const levelLabel = this.config.levels
      ? this.options.currentLevelId === undefined
        ? "LEVEL ..."
        : `LEVEL ${this.options.currentLevelId + 1}`
      : "CUSTOM LEVEL";

    return `<main class="shell puzzle-shell">
      ${header}
      <section class="workspace" aria-label="Picture puzzle workspace">
        <div class="puzzle-column"><div class="board-actions"><p class="level-label" data-level-label>${levelLabel}</p><div class="board-action-buttons">${hintButton}${settingsButton}</div></div><div class="game-card">${hud}${board}</div></div>
      </section>
      ${settingsDialog}
    </main>`;
  }

  private get timeLimitSeconds(): number {
    return this.progress.startingGroups
      ? this.config.scoring.baseTime +
          this.progress.startingGroups *
            this.config.scoring.secondsPerStartingSet
      : 0;
  }

  private get timeExpired(): boolean {
    return (
      this.timeLimitSeconds > 0 && this.elapsedSeconds > this.timeLimitSeconds
    );
  }

  private get stars(): number {
    const moveLimitExceeded =
      this.progress.moveLimit > 0 &&
      this.progress.moves > this.progress.moveLimit;
    return (
      this.config.scoring.startingStars -
      Number(this.timeExpired) -
      Number(this.targetHintUsed) -
      Number(moveLimitExceeded)
    );
  }

  private updateComponents(): void {
    const components = this.config.components;
    const displayedSeconds = this.timeExpired
      ? this.elapsedSeconds - this.timeLimitSeconds
      : Math.max(0, this.timeLimitSeconds - this.elapsedSeconds);
    this.hud?.update({
      moves: this.progress.moves,
      moveLimit: this.progress.moveLimit,
      stars: this.stars,
      startingStars: this.config.scoring.startingStars,
      displayedSeconds,
      gameStarted: this.gameStarted,
      timeExpired: this.timeExpired,
    });
    this.controls?.update(this.pendingGridSize, this.pendingTileShape);
    this.targetHint?.update({
      imageUrl: this.imageUrl,
      visible: this.targetHintVisible,
      used: this.targetHintUsed,
      won: this.progress.won,
      allowed: components.targetHint.allowUse,
    });
    this.completionModal?.update(
      this.progress.won,
      this.stars,
      this.config.scoring.startingStars,
      this.pointsAwarded,
      this.isCheater,
    );
  }

  private createBoard(): void {
    if (!this.canvasHost) {
      this.markReady();
      return;
    }
    this.board?.destroy();
    this.canvasHost.replaceChildren();
    this.canvasHost.setAttribute(
      "aria-label",
      `Interactive ${this.tileShape} ${this.gridSize} by ${this.gridSize} tile-swapping picture puzzle`
    );
    this.board = new PuzzleBoard(this.canvasHost, {
      imageUrl: this.imageUrl,
      gridSize: this.gridSize,
      tileShape: this.tileShape,
      scoring: this.config.scoring,
      initialState: this.restoredAttempt ?? undefined,
      random: this.levelId === null || !this.config.levels
        ? Math.random
        : randomForLevel(this.levelId, "shuffle", this.config.levels.useLevelIdSeed),
      onProgress: (progress) => {
        const completedNow = progress.won && !this.progress.won;
        this.progress = progress;
        if (completedNow) {
          this.stopTimer();
          this.targetHintVisible = false;
          levelAttemptStore.clear();
          this.isCheater = levelProgressStore.isCheater;
          this.pointsAwarded = this.levelId === null || this.isCheater
            ? 0
            : huzzle.utils.pointsForCompletion(this.stars, this.gridSize, this.tileShape);
          this.completionSave = this.saveCompletedLevel();
          this.nextLevelPreload = this.preloadNextLevel();
        } else {
          this.saveCurrentAttempt();
        }
        this.updateComponents();
      },
      onStart: () => this.startTimer(),
      onReady: this.markReady,
    });
    this.restoredAttempt = null;
    if (this.gameStarted && this.timerId === null) {
      this.timerId = window.setInterval(() => this.updateTimer(), Utils.toMilliseconds(0.25));
    }
  }

  private markReady = () => {
    if (this.readyResolved) return;
    this.readyResolved = true;
    this.resolveReady();
  };

  private renderLevelLabel(levelId: number): void {
    this.levelLabel.textContent = `LEVEL ${levelId + 1}`;
  }

  private async saveCompletedLevel(): Promise<void> {
    if (this.levelId === null) return;
    const completion = await levelProgressStore.complete(
      this.levelId + 1,
      this.stars,
      this.gridSize,
      this.tileShape,
    );
    this.pointsAwarded = completion.pointsAwarded;
    this.isCheater = completion.isCheater;
    if (!this.destroyed) this.updateComponents();
  }

  private preloadNextLevel(): Promise<LoadedLevel | null> {
    const levels = this.config.levels;
    if (!levels || this.levelId === null) return Promise.resolve(null);
    return levelPreloader.preload(
      appConfig.levels.manifestUrl,
      {
        mode: levels.selectionMode,
        currentLevelId: this.levelId + 1,
      },
      levels.requestTimeout,
    ).catch(() => null);
  }

  private showTargetHint(): void {
    const components = this.config.components;
    if (
      !components.targetHint.allowUse ||
      this.progress.won
    )
      return;
    this.targetHintUsed = true;
    this.targetHintVisible = true;
    this.saveCurrentAttempt();
    this.updateComponents();
  }

  private hideTargetHint(): void {
    if (!this.targetHintVisible) return;
    this.targetHintVisible = false;
    this.updateComponents();
  }

  private startTimer(): void {
    if (this.gameStarted || this.progress.won) return;
    this.gameStarted = true;
    this.timerStartedAt = Date.now();
    this.saveCurrentAttempt();
    this.updateComponents();
    this.updateTimer();
    this.timerId = window.setInterval(() => this.updateTimer(), Utils.toMilliseconds(0.25));
  }

  private updateTimer(): void {
    if (this.timerStartedAt === null) return;
    const elapsedSeconds = Math.floor((Date.now() - this.timerStartedAt) / 1000);
    if (elapsedSeconds === this.elapsedSeconds) return;
    this.elapsedSeconds = elapsedSeconds;
    this.saveCurrentAttempt();
    this.updateComponents();
  }

  private stopTimer(): void {
    if (this.timerId !== null) window.clearInterval(this.timerId);
    this.timerId = null;
  }

  private changeGridSize(size: GridSize): void {
    this.pendingGridSize = size;
    this.controls?.update(this.pendingGridSize, this.pendingTileShape);
  }

  private changeTileShape(shape: TileShapeTypes): void {
    this.pendingTileShape = shape;
    this.controls?.update(this.pendingGridSize, this.pendingTileShape);
  }

  private applySettingsAndShuffle(): void {
    this.gridSize = this.pendingGridSize;
    this.tileShape = this.pendingTileShape;
    if (this.pendingImageFile) {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = URL.createObjectURL(this.pendingImageFile);
      this.imageUrl = this.objectUrl;
      this.pendingImageFile = null;
    }
    this.updateBoardAspect();
    this.resetChallenge();
    this.closeSettings();
  }

  private resetChallenge(): void {
    this.stopTimer();
    this.timerStartedAt = null;
    this.elapsedSeconds = 0;
    this.gameStarted = false;
    this.targetHintUsed = false;
    this.targetHintVisible = false;
    this.pointsAwarded = 0;
    this.isCheater = false;
    this.progress = emptyProgress(this.gridSize);
    this.updateComponents();
    this.createBoard();
  }

  private handleUpload(file: File): void {
    this.pendingImageFile = file;
  }

  private handlePageHide = () => this.destroy();

  destroy(): void {
    this.saveCurrentAttempt();
    this.destroyed = true;
    this.markReady();
    window.removeEventListener("pagehide", this.handlePageHide);
    this.stopTimer();
    this.board?.destroy();
    this.controls?.destroy();
    this.workspaceResizeObserver.disconnect();
    this.settingsButton?.removeEventListener("click", this.openSettings);
    this.settingsCloseButton?.removeEventListener("click", this.closeSettings);
    this.settingsDialog?.removeEventListener("click", this.closeSettingsFromBackdrop);
    this.targetHint?.destroy();
    this.completionModal?.destroy();
    this.header?.destroy();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.root.replaceChildren();
  }
}
