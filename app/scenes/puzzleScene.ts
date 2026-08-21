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
  TargetPreview,
  targetPreviewMarkup,
} from "../components/puzzle/targetPreview";
import { gameConfig } from "../config/gameConfig";
import { puzzleSceneConfig } from "../config/scenes/puzzleSceneConfig";
import { createSampleImage, loadRandomLevelImage } from "../systems/imageProcessor";
import type { SceneManager } from "../systems/sceneManager";
import { GridSize, PuzzleProgress, TileShape } from "../types/gameTypes";
import { MainMenuScene } from "./mainMenuScene";

type PuzzleSceneOptions = {
  initialImageFile?: File;
};

export type PuzzleSceneConfig = {
  randomImages?: {
    levelsUrl: string;
    imageBaseUrl: string;
    requestTimeoutMs: number;
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
    targetPreview: {
      enabled: boolean;
      allowReveal: boolean;
    };
    completionModal: { enabled: boolean };
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
  private gridSize = gameConfig.grid.defaultSize;
  private tileShape = gameConfig.pieces.defaultShape;
  private progress = emptyProgress(this.gridSize);
  private elapsedSeconds = 0;
  private gameStarted = false;
  private targetRevealed = false;
  private objectUrl: string | null = null;
  private timerStartedAt: number | null = null;
  private timerId: number | null = null;
  private board: PuzzleBoard | null = null;
  private header: AppHeader | null = null;
  private hud: PuzzleHUD | null = null;
  private controls: PuzzleControls | null = null;
  private targetPreview: TargetPreview | null = null;
  private completionModal: CompletionModal | null = null;
  private imageRequest: AbortController | null = null;
  private destroyed = false;
  private readonly canvasHost: HTMLDivElement | null;
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
    if (components.targetPreview.enabled) {
      this.targetPreview = new TargetPreview(root, () => this.revealTarget());
    }
    if (components.completionModal.enabled)
      this.completionModal = new CompletionModal(root);

    this.updateComponents();
    void this.initializeBoard();
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
  }

  protected getConfig(): PuzzleSceneConfig {
    return puzzleSceneConfig;
  }

  private returnToMainMenu = () => this.sceneManager.loadScene(MainMenuScene);

  private async initializeBoard(): Promise<void> {
    const randomImages = this.config.randomImages;
    if (!this.options.initialImageFile && randomImages) {
      this.canvasHost?.replaceChildren(this.loadingMessage());
      this.imageRequest = new AbortController();
      const timeoutId = window.setTimeout(() => this.imageRequest?.abort(), randomImages.requestTimeoutMs);
      try {
        this.imageUrl = await loadRandomLevelImage(
          randomImages.levelsUrl,
          randomImages.imageBaseUrl,
          this.imageRequest.signal,
        );
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
      ? completionModalMarkup()
      : "";
    const board = components.board.enabled
      ? `<div class="canvas-wrap"><div class="canvas-host"></div>${completion}</div>`
      : "";
    const preview = components.targetPreview.enabled
      ? targetPreviewMarkup()
      : "";
    const controls = components.controls.enabled
      ? puzzleControlsMarkup(components.controls)
      : "";
    const sidebar =
      preview || controls
        ? `<aside class="side-panel">${preview}${controls}</aside>`
        : "";

    return `<main class="shell">
      ${header}
      <section class="hero"><div><p class="eyebrow">Swap · connect · complete</p></div></section>
      <section class="workspace" aria-label="Picture puzzle workspace">
        <div class="game-card">${hud}${board}</div>
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
      Number(this.targetRevealed) -
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
    this.targetPreview?.update({
      imageUrl: this.imageUrl,
      revealed: this.targetRevealed,
      won: this.progress.won,
      revealAllowed: components.targetPreview.allowReveal,
    });
    this.completionModal?.update(
      this.progress.won,
      this.stars,
      gameConfig.scoring.startingStars
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
        this.progress = progress;
        if (progress.won) this.stopTimer();
        this.updateComponents();
      },
      onStart: () => this.startTimer(),
    });
  }

  private revealTarget(): void {
    const components = this.config.components;
    if (
      !components.targetPreview.allowReveal ||
      this.targetRevealed ||
      this.progress.won
    )
      return;
    this.targetRevealed = true;
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
    this.targetRevealed = false;
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
    this.targetPreview?.destroy();
    this.header?.destroy();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.root.replaceChildren();
  }
}
