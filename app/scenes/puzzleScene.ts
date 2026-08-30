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
import { loadLevelImage, type LevelSelectionMode } from "../systems/levelService";
import { levelProgressStore, pointsForStars } from "../services/levelProgressStore";
import type { SceneManager } from "../systems/sceneManager";
import { GridSize, PuzzleProgress, TileShape } from "../types/gameTypes";
import { MainMenuScene } from "./mainMenuScene";

type PuzzleSceneOptions = {
  initialImageFile?: File;
  currentLevelId?: number;
};

export type PuzzleSceneConfig = {
  levels?: {
    requestTimeoutMs: number;
    selectionMode: LevelSelectionMode;
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
    };
  };
};

function emptyProgress(gridSize: GridSize): PuzzleProgress {
  return {
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
  private imageRequest: AbortController | null = null;
  private completionSave: Promise<void> | null = null;
  private pointsAwarded = 0;
  private destroyed = false;
  private readonly canvasHost: HTMLDivElement | null;
  private readonly levelLabel: HTMLElement;
  private readonly config: PuzzleSceneConfig;

  constructor(
    private readonly root: HTMLElement,
    private readonly sceneManager: SceneManager,
    private readonly options: PuzzleSceneOptions = {}
  ) {
    this.config = this.getConfig();
    if (options.initialImageFile) {
      this.objectUrl = URL.createObjectURL(options.initialImageFile);
      this.imageUrl = this.objectUrl;
    }
    root.innerHTML = this.markup();
    this.levelLabel = requiredElement<HTMLElement>(root, "[data-level-label]");
    const components = this.config.components;
    this.canvasHost = components.board.enabled
      ? requiredElement<HTMLDivElement>(root, ".canvas-host")
      : null;

    if (components.header.enabled)
      this.header = new AppHeader(root, this.returnToMainMenu);
    if (components.hud.enabled) this.hud = new PuzzleHUD(root, components.hud);
    if (components.controls.enabled) {
      this.controls = new PuzzleControls(root, components.controls, {
        onImageUpload: (file) => this.handleUpload(file),
        onShapeChange: (shape) => this.changeTileShape(shape),
        onGridChange: (size) => this.changeGridSize(size),
        onRestart: () => this.resetChallenge(),
      });
    }
    if (components.board.enabled && components.targetHint.enabled) {
      this.targetHint = new TargetHint(
        root,
        () => this.showTargetHint(),
        () => this.hideTargetHint(),
      );
    }
    if (components.completionModal.enabled)
      this.completionModal = new CompletionModal(root, this.loadNextLevel);

    this.updateComponents();
    void this.initializeBoard();
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
  }

  protected getConfig(): PuzzleSceneConfig {
    return puzzleSceneConfig;
  }

  private returnToMainMenu = () => this.sceneManager.loadScene(MainMenuScene);

  private loadNextLevel = async () => {
    if (!this.config.levels || !this.progress.won) return;
    await this.completionSave;
    this.sceneManager.loadScene(PuzzleScene, {
      currentLevelId: this.levelId === null ? undefined : this.levelId + 1,
    });
  };

  private async initializeBoard(): Promise<void> {
    const levels = this.config.levels;
    if (!this.options.initialImageFile && levels) {
      this.canvasHost?.replaceChildren(this.loadingMessage());
      const storedProgress = await levelProgressStore.load();
      const currentLevelId = this.options.currentLevelId ?? storedProgress.currentLevel;
      this.renderLevelLabel(currentLevelId);
      this.imageRequest = new AbortController();
      const timeoutId = window.setTimeout(() => this.imageRequest?.abort(), levels.requestTimeoutMs);
      try {
        const loadedLevel = await loadLevelImage(
          appConfig.levels.manifestUrl,
          {
            mode: levels.selectionMode,
            currentLevelId,
          },
          this.imageRequest.signal,
        );
        this.levelId = loadedLevel.id;
        this.renderLevelLabel(loadedLevel.id);
        this.imageUrl = loadedLevel.imageUrl;
      } catch {
        // Keep the generated sample image as the offline/network fallback.
      } finally {
        window.clearTimeout(timeoutId);
        this.imageRequest = null;
      }
    }
    if (this.destroyed) return;
    this.updateComponents();
    this.createBoard();
  }

  private loadingMessage(): HTMLParagraphElement {
    const message = document.createElement("p");
    message.className = "loading";
    message.textContent = "Loading puzzle…";
    return message;
  }

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
      ? puzzleControlsMarkup(components.controls)
      : "";
    const sidebar =
      controls
        ? `<aside class="side-panel">${controls}</aside>`
        : "";

    const levelLabel = this.config.levels
      ? this.options.currentLevelId === undefined
        ? "LEVEL ..."
        : `LEVEL ${this.options.currentLevelId + 1}`
      : "CUSTOM LEVEL";

    return `<main class="shell">
      ${header}
      <section class="workspace${sidebar ? " has-sidebar" : ""}" aria-label="Picture puzzle workspace">
        <div class="puzzle-column"><div class="board-actions"><p class="level-label" data-level-label>${levelLabel}</p>${hintButton}</div><div class="game-card">${hud}${board}</div></div>
        ${sidebar}
      </section>
    </main>`;
  }

  private get timeLimitSeconds(): number {
    return this.progress.startingGroups
      ? gameConfig.scoring.baseTimeSeconds +
          this.progress.startingGroups *
            gameConfig.scoring.secondsPerStartingSet
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
      gameConfig.scoring.startingStars -
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
      startingStars: gameConfig.scoring.startingStars,
      displayedSeconds,
      gameStarted: this.gameStarted,
      timeExpired: this.timeExpired,
    });
    this.controls?.update(this.gridSize, this.tileShape);
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
      gameConfig.scoring.startingStars,
      this.pointsAwarded,
    );
  }

  private createBoard(): void {
    if (!this.canvasHost) return;
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
      onProgress: (progress) => {
        const completedNow = progress.won && !this.progress.won;
        this.progress = progress;
        if (completedNow) {
          this.stopTimer();
          this.targetHintVisible = false;
          this.pointsAwarded = this.levelId === null ? 0 : pointsForStars(this.stars);
          this.completionSave = this.saveCompletedLevel();
        }
        this.updateComponents();
      },
      onStart: () => this.startTimer(),
    });
  }

  private renderLevelLabel(levelId: number): void {
    this.levelLabel.textContent = `LEVEL ${levelId + 1}`;
  }

  private async saveCompletedLevel(): Promise<void> {
    if (this.levelId === null) return;
    const completion = await levelProgressStore.complete(this.levelId + 1, this.stars);
    this.pointsAwarded = completion.pointsAwarded;
    if (!this.destroyed) this.updateComponents();
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
    this.updateTimer();
    this.timerId = window.setInterval(() => this.updateTimer(), 250);
  }

  private updateTimer(): void {
    if (this.timerStartedAt === null) return;
    this.elapsedSeconds = Math.floor((Date.now() - this.timerStartedAt) / 1000);
    this.updateComponents();
  }

  private stopTimer(): void {
    if (this.timerId !== null) window.clearInterval(this.timerId);
    this.timerId = null;
  }

  private changeGridSize(size: GridSize): void {
    if (size === this.gridSize) return;
    this.gridSize = size;
    this.resetChallenge();
  }

  private changeTileShape(shape: TileShape): void {
    if (shape === this.tileShape) return;
    this.tileShape = shape;
    this.resetChallenge();
  }

  private resetChallenge(): void {
    this.stopTimer();
    this.timerStartedAt = null;
    this.elapsedSeconds = 0;
    this.gameStarted = false;
    this.targetHintUsed = false;
    this.targetHintVisible = false;
    this.pointsAwarded = 0;
    this.progress = emptyProgress(this.gridSize);
    this.updateComponents();
    this.createBoard();
  }

  private handleUpload(file: File): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(file);
    this.imageUrl = this.objectUrl;
    this.resetChallenge();
  }

  private handlePageHide = () => this.destroy();

  destroy(): void {
    this.destroyed = true;
    this.imageRequest?.abort();
    this.imageRequest = null;
    window.removeEventListener("pagehide", this.handlePageHide);
    this.stopTimer();
    this.board?.destroy();
    this.controls?.destroy();
    this.targetHint?.destroy();
    this.completionModal?.destroy();
    this.header?.destroy();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.root.replaceChildren();
  }
}
