import { huzzle } from "drygon-huzzle-rules";
import { AppHeader } from "../components/common/appHeader";
import { CompletionModal } from "../components/puzzle/completionModal";
import { PuzzleControls } from "../components/puzzle/puzzleControls";
import { PuzzleHUD } from "../components/puzzle/puzzleHUD";
import { TargetHint } from "../components/puzzle/targetHint";
import { gameConfig } from "../config/gameConfig";
import { puzzleSceneConfig } from "../config/scenes/puzzleSceneConfig";
import { PuzzleAttemptController } from "../controllers/puzzle/puzzleAttemptController";
import { PuzzleLevelController } from "../controllers/puzzle/puzzleLevelController";
import { PuzzleTimer } from "../controllers/puzzle/puzzleTimer";
import { PuzzleBoard } from "../gameplay/puzzle/puzzleBoard";
import { PuzzleSceneLayout } from "../layouts/puzzleSceneLayout";
import { levelProgressStore } from "../services/levelProgressStore";
import type { LevelAttemptSnapshot } from "../services/levelAttemptStore";
import { adsManager } from "../systems/ads/adsManager";
import { deviceFeedback } from "../systems/deviceFeedback";
import { createSampleImage } from "../systems/imageProcessor";
import { randomForLevel } from "../systems/levelDesign";
import type { LoadedLevel } from "../types/levelTypes";
import type { SceneNavigator } from "../types/sceneTypes";
import type {
  GridSize,
  PuzzleProgress,
  TileShapeTypes,
} from "../types/gameTypes";
import type {
  DebugPuzzleRuntimeState,
  DebugPuzzleScenario,
  DebugPuzzleState,
} from "../types/debugTypes";
import type { PlayerProgress } from "../types/progressTypes";
import type {
  PuzzleSceneConfig,
  PuzzleSceneOptions,
} from "../types/puzzleSceneTypes";

export type { PuzzleSceneConfig } from "../types/puzzleSceneTypes";

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

export class PuzzleScene {
  static readonly sceneConfig: PuzzleSceneConfig = puzzleSceneConfig;

  private imageUrl = createSampleImage();
  private levelId: number | null = null;
  private gridSize = gameConfig.grid.defaultSize;
  private tileShape = gameConfig.pieces.defaultShape;
  private pendingGridSize = this.gridSize;
  private pendingTileShape = this.tileShape;
  private pendingImageFile: File | null = null;
  private progress = emptyProgress(this.gridSize);
  private targetHintUsed = false;
  private targetHintVisible = false;
  private objectUrl: string | null = null;
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
  private debugStarsOverride: number | null = null;
  private pendingDebugScenario: DebugPuzzleScenario | null = null;
  private debugScenarioActive = false;
  private readonly debugStateListeners = new Set<
    (state: DebugPuzzleState) => void
  >();
  private loadingNextLevel = false;
  private destroyed = false;
  private readyResolved = false;
  private readonly config: PuzzleSceneConfig;
  private readonly view: PuzzleSceneLayout;
  private readonly attempts = new PuzzleAttemptController();
  private readonly timer = new PuzzleTimer(() => {
    this.saveCurrentAttempt();
    this.updateComponents();
  });
  private readonly levels: PuzzleLevelController | null;
  readonly ready: Promise<void>;
  private resolveReady: () => void = () => undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly navigator: SceneNavigator,
    private readonly options: PuzzleSceneOptions = {},
  ) {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    this.config = this.getConfig();
    this.levels = this.config.levels
      ? new PuzzleLevelController(this.config.levels)
      : null;
    const initialLevelId = options.preparedLevel?.id ?? options.currentLevelId;
    if (initialLevelId !== undefined) this.applyLevelDesign(initialLevelId);
    if (options.initialImageFile) {
      this.objectUrl = URL.createObjectURL(options.initialImageFile);
      this.imageUrl = this.objectUrl;
    }
    this.view = new PuzzleSceneLayout(
      root,
      this.config,
      initialLevelId,
      this.tileShape,
      this.gridSize,
    );

    const components = this.config.components;
    if (components.header.enabled) {
      this.header = new AppHeader(root, this.returnToMainMenu);
    }
    if (components.hud.enabled) {
      this.hud = new PuzzleHUD(root, components.hud);
    }
    if (components.controls.enabled) {
      this.controls = new PuzzleControls(
        root,
        { ...components.controls, enabledShapes: this.config.enabledShapes },
        {
          onImageUpload: (file) => this.handleUpload(file),
          onShapeChange: (shape) => this.changeTileShape(shape),
          onGridChange: (size) => this.changeGridSize(size),
          onRestart: () => this.applySettingsAndShuffle(),
        },
      );
    }
    if (components.board.enabled && components.targetHint.enabled) {
      this.targetHint = new TargetHint(
        root,
        () => this.showTargetHint(),
        () => this.hideTargetHint(),
      );
    }
    if (components.completionModal.enabled) {
      this.completionModal = new CompletionModal(root, {
        onNextLevel: this.loadNextLevel,
        onShuffle: () => this.resetChallenge(),
      });
    }

    this.updateComponents();
    void this.initializeBoard();
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
  }

  protected getConfig(): PuzzleSceneConfig {
    return puzzleSceneConfig;
  }

  getDebugPuzzleState(): DebugPuzzleState {
    return {
      gridSize: this.gridSize,
      tileShape: this.tileShape,
      moves: this.progress.moves,
      stars: this.stars,
      maximumStars: this.config.scoring.startingStars,
      timeRemaining: Math.max(0, this.timeLimit - this.timer.elapsed),
    };
  }

  subscribeDebugPuzzleState(
    listener: (state: DebugPuzzleState) => void,
  ): () => void {
    this.debugStateListeners.add(listener);
    listener(this.getDebugPuzzleState());
    return () => this.debugStateListeners.delete(listener);
  }

  applyDebugPuzzleRuntime(state: Partial<DebugPuzzleRuntimeState>): void {
    this.debugScenarioActive = true;
    if (state.stars !== undefined) {
      this.debugStarsOverride = Math.max(
        0,
        Math.min(this.config.scoring.startingStars, Math.trunc(state.stars)),
      );
    }
    if (state.timeRemaining !== undefined) {
      const elapsed = Math.max(
        0,
        this.timeLimit - Math.trunc(state.timeRemaining),
      );
      const shouldRun = this.timer.started || elapsed > 0;
      this.timer.restore(elapsed, shouldRun);
      this.timer.resume();
    }
    if (state.moves !== undefined && this.board?.applyDebugMoves(state.moves))
      return;
    this.updateComponents();
  }

  completeDebugPuzzle(): void {
    this.debugScenarioActive = true;
    this.board?.completeDebugPuzzle();
  }

  restartDebugPuzzle(): void {
    this.attempts.clear();
    this.resetChallenge(true);
  }

  applyDebugPuzzleScenario(scenario: DebugPuzzleScenario): void {
    this.attempts.clear();
    this.debugScenarioActive = true;
    this.pendingDebugScenario = scenario;
    this.debugStarsOverride = Math.max(
      0,
      Math.min(this.config.scoring.startingStars, Math.trunc(scenario.stars)),
    );
    this.gridSize = scenario.gridSize;
    this.tileShape = scenario.tileShape;
    this.pendingGridSize = scenario.gridSize;
    this.pendingTileShape = scenario.tileShape;
    this.timer.reset();
    this.targetHintUsed = false;
    this.targetHintVisible = false;
    this.pointsAwarded = 0;
    this.isCheater = false;
    this.progress = emptyProgress(this.gridSize);
    this.view.updateBoardLayout(this.tileShape, this.gridSize);
    this.updateComponents();
    this.createBoard();
  }

  onDebugProgressChanged(progress: PlayerProgress): void {
    if (!this.levels || this.levelId === progress.currentLevel) return;
    void this.navigator.navigateWhenReady("puzzle", {
      currentLevelId: progress.currentLevel,
    });
  }

  private returnToMainMenu = () => {
    this.saveCurrentAttempt();
    return this.navigator.navigate("mainMenu");
  };

  private loadNextLevel = async () => {
    if (!this.levels || !this.progress.won || this.loadingNextLevel) return;
    this.loadingNextLevel = true;
    try {
      await adsManager.showInterstitialAfterLevel();
      if (this.destroyed) return;
      const [, preparedLevel] = await Promise.all([
        this.completionSave,
        this.nextLevelPreload,
      ]);
      if (this.destroyed) return;
      await this.navigator.navigateWhenReady(
        "puzzle",
        preparedLevel
          ? { currentLevelId: preparedLevel.id, preparedLevel }
          : {
              currentLevelId:
                this.levelId === null ? undefined : this.levelId + 1,
              skipLevelLoad: true,
            },
      );
    } finally {
      if (!this.destroyed) this.loadingNextLevel = false;
    }
  };

  private async initializeBoard(): Promise<void> {
    if (
      !this.options.initialImageFile &&
      this.levels &&
      !this.options.skipLevelLoad
    ) {
      const result = await this.levels.load(
        this.options.currentLevelId,
        this.options.preparedLevel,
      );
      this.view.renderLevelLabel(result.currentLevelId);
      if (result.level) this.applyLevel(result.level);
    }
    if (this.destroyed) return;
    this.updateComponents();
    this.createBoard();
  }

  private applyLevel(level: LoadedLevel): void {
    this.levelId = level.id;
    this.applyLevelDesign(level.id);
    this.restoreLevelAttempt();
    this.view.updateBoardLayout(this.tileShape, this.gridSize);
    this.view.renderLevelLabel(level.id);
    this.imageUrl = level.imageUrl;
  }

  private restoreLevelAttempt(): void {
    if (this.levelId === null) return;
    const restored = this.attempts.restore(
      this.levelId,
      this.gridSize,
      this.tileShape,
    );
    this.restoredAttempt = restored?.snapshot ?? null;
    if (!restored) return;
    this.progress = restored.progress;
    this.timer.restore(restored.elapsed, restored.started);
    this.targetHintUsed = restored.hintUsed;
  }

  private saveCurrentAttempt(): void {
    if (this.debugScenarioActive) return;
    this.attempts.save({
      levelId: this.levelId,
      gridSize: this.gridSize,
      tileShape: this.tileShape,
      progress: this.progress,
      started: this.timer.started,
      elapsed: this.timer.elapsed,
      hintUsed: this.targetHintUsed,
    });
  }

  private applyLevelDesign(levelId: number): void {
    if (!this.levels) return;
    const design = this.levels.designFor(levelId, this.config.enabledShapes);
    this.gridSize = design.gridSize;
    this.tileShape = design.tileShape;
    this.pendingGridSize = design.gridSize;
    this.pendingTileShape = design.tileShape;
  }

  private get timeLimit(): number {
    return this.progress.startingGroups
      ? this.config.scoring.baseTime +
          this.progress.startingGroups *
            this.config.scoring.secondsPerStartingSet
      : 0;
  }

  private get timeExpired(): boolean {
    return this.timeLimit > 0 && this.timer.elapsed > this.timeLimit;
  }

  private get stars(): number {
    if (this.debugStarsOverride !== null) return this.debugStarsOverride;
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
    const displayedSeconds = this.timeExpired
      ? this.timer.elapsed - this.timeLimit
      : Math.max(0, this.timeLimit - this.timer.elapsed);
    this.hud?.update({
      moves: this.progress.moves,
      moveLimit: this.progress.moveLimit,
      stars: this.stars,
      startingStars: this.config.scoring.startingStars,
      displayedSeconds,
      gameStarted: this.timer.started,
      timeExpired: this.timeExpired,
    });
    this.controls?.update(this.pendingGridSize, this.pendingTileShape);
    this.targetHint?.update({
      imageUrl: this.imageUrl,
      visible: this.targetHintVisible,
      used: this.targetHintUsed,
      won: this.progress.won,
      allowed: this.config.components.targetHint.allowUse,
    });
    this.completionModal?.update(
      this.progress.won,
      this.stars,
      this.config.scoring.startingStars,
      this.pointsAwarded,
      this.isCheater,
    );
    const debugState = this.getDebugPuzzleState();
    this.debugStateListeners.forEach((listener) => listener(debugState));
  }

  private createBoard(): void {
    const host = this.view.canvasHost;
    if (!host) {
      this.markReady();
      return;
    }
    this.board?.destroy();
    host.replaceChildren();
    host.setAttribute(
      "aria-label",
      `Interactive ${this.tileShape} ${this.gridSize} by ${this.gridSize} tile-swapping picture puzzle`,
    );
    this.board = new PuzzleBoard(host, {
      imageUrl: this.imageUrl,
      gridSize: this.gridSize,
      tileShape: this.tileShape,
      scoring: this.config.scoring,
      initialState: this.restoredAttempt ?? undefined,
      random:
        this.levelId === null || !this.config.levels
          ? Math.random
          : randomForLevel(
              this.levelId,
              "shuffle",
              this.config.levels.useLevelIdSeed,
            ),
      onProgress: (progress) => this.handleProgress(progress),
      onStart: () => this.timer.start(),
      onReady: this.handleBoardReady,
    });
    this.restoredAttempt = null;
    this.timer.resume();
  }

  private handleProgress(progress: PuzzleProgress): void {
    const completedNow = progress.won && !this.progress.won;
    this.progress = progress;
    if (completedNow) {
      this.timer.stop();
      void deviceFeedback.completion(
        this.stars === this.config.scoring.startingStars,
      );
      this.targetHintVisible = false;
      this.attempts.clear();
      this.isCheater = this.levels?.isCheater ?? levelProgressStore.isCheater;
      this.pointsAwarded =
        this.levelId === null || this.isCheater || !huzzle.utils.isGridSize(this.gridSize)
          ? 0
          : huzzle.utils.pointsForCompletion(
              this.stars,
              this.gridSize,
              this.tileShape,
            );
      this.completionSave = this.debugScenarioActive
        ? Promise.resolve()
        : this.saveCompletedLevel();
      this.nextLevelPreload = this.preloadNextLevel();
    } else {
      this.saveCurrentAttempt();
    }
    this.updateComponents();
  }

  private markReady = () => {
    if (this.readyResolved) return;
    this.readyResolved = true;
    this.resolveReady();
  };

  private handleBoardReady = () => {
    const scenario = this.pendingDebugScenario;
    if (scenario && this.board) {
      this.pendingDebugScenario = null;
      this.board.applyDebugScenario(scenario.groups, scenario.moves);
      const elapsed = Math.max(0, this.timeLimit - scenario.timeRemaining);
      this.timer.restore(elapsed, elapsed > 0);
      this.timer.resume();
      this.updateComponents();
    }
    this.markReady();
  };

  private async saveCompletedLevel(): Promise<void> {
    if (this.levelId === null || !this.levels) return;
    const completion = await this.levels.complete(
      this.levelId,
      this.stars,
      this.gridSize,
      this.tileShape,
    );
    this.pointsAwarded = completion.pointsAwarded;
    this.isCheater = completion.isCheater;
    if (!this.destroyed) this.updateComponents();
  }

  private preloadNextLevel(): Promise<LoadedLevel | null> {
    return this.levelId === null || !this.levels
      ? Promise.resolve(null)
      : this.levels.preloadNext(this.levelId);
  }

  private showTargetHint(): void {
    if (!this.config.components.targetHint.allowUse || this.progress.won) return;
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
    this.view.updateBoardLayout(this.tileShape, this.gridSize);
    this.resetChallenge();
    this.view.closeSettingsPanel();
  }

  private resetChallenge(debugScenario = false): void {
    this.debugScenarioActive = debugScenario;
    this.debugStarsOverride = null;
    this.pendingDebugScenario = null;
    this.timer.reset();
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
    this.timer.destroy();
    this.debugStateListeners.clear();
    this.board?.destroy();
    this.controls?.destroy();
    this.view.destroy();
    this.targetHint?.destroy();
    this.completionModal?.destroy();
    this.header?.destroy();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.root.replaceChildren();
  }
}
