import { gameConfig } from "../config/gameConfig";
import { levelProgressStore } from "../services/levelProgressStore";
import type { DebugSceneTarget } from "../types/debugTypes";
import type { GridSize, TileShapeTypes } from "../types/gameTypes";
import type { Scene } from "../types/sceneTypes";
import { requiredElement } from "../utils/dom";
import { debugGroupsFromCells } from "./debugScenario";

const groupColors = [
  "#ff7848",
  "#5bc9aa",
  "#ffd166",
  "#62a8ff",
  "#e98cff",
  "#ff8fa3",
  "#8fd14f",
  "#c5a3ff",
];

export class DebugPanel {
  private readonly root = document.createElement("div");
  private readonly trigger: HTMLButtonElement;
  private readonly drawer: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly progressForm: HTMLFormElement;
  private readonly levelInput: HTMLInputElement;
  private readonly pointsInput: HTMLInputElement;
  private readonly resetProgressButton: HTMLButtonElement;
  private readonly message: HTMLElement;
  private readonly puzzleSection: HTMLElement;
  private readonly puzzleUnavailable: HTMLElement;
  private readonly gridSizeSelect: HTMLSelectElement;
  private readonly shapeSelect: HTMLSelectElement;
  private readonly movesInput: HTMLInputElement;
  private readonly starsInput: HTMLInputElement;
  private readonly timerInput: HTMLInputElement;
  private readonly restartPuzzleButton: HTMLButtonElement;
  private readonly completePuzzleButton: HTMLButtonElement;
  private readonly grid: HTMLElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly runButton: HTMLButtonElement;
  private scene: DebugSceneTarget | null = null;
  private cells: Array<number | null> = [];
  private drawingGroup: number | null = null;
  private drawingPointer: number | null = null;
  private nextGroup = 1;
  private unsubscribePuzzleState: (() => void) | null = null;

  constructor() {
    this.root.className = "debug-tools";
    this.root.innerHTML = `<button class="debug-trigger" type="button" aria-controls="debug-panel" aria-expanded="false">DEBUG <kbd>T</kbd></button>
      <aside class="debug-panel" id="debug-panel" aria-label="Huzzle debug tools" aria-hidden="true">
        <header><div><small>Development tools</small><h2>Debug lab</h2></div><button class="debug-close" type="button" aria-label="Close debug tools">&times;</button></header>
        <form class="debug-section debug-progress-form">
          <h3>Player</h3>
          <div class="debug-field-row">
            <label>Level<input name="level" type="number" min="1" step="1"></label>
            <label>Weekly points<input name="points" type="number" min="0" step="1"></label>
          </div>
          <div class="debug-actions"><button type="submit">Apply values</button><button class="debug-secondary" type="button" data-reset-progress>Use saved</button></div>
          <p class="debug-message" role="status"></p>
        </form>
        <p class="debug-puzzle-unavailable">Open a puzzle to build a board scenario.</p>
        <section class="debug-section debug-puzzle" hidden>
          <h3>Puzzle scenario</h3>
          <div class="debug-field-row">
            <label>Grid<select name="grid-size">${gameConfig.grid.sizes.map((size) => `<option value="${size}">${size} x ${size}</option>`).join("")}</select></label>
            <label>Shape<select name="tile-shape">${gameConfig.pieces.shapes.map(({ value, label }) => `<option value="${value}">${label}</option>`).join("")}</select></label>
          </div>
          <div class="debug-field-row debug-field-row-three">
            <label>Moves<input name="moves" type="number" min="0" step="1"></label>
            <label>Stars<input name="stars" type="number" min="0" step="1"></label>
            <label>Time remaining<input name="timer" type="number" min="0" step="1"></label>
          </div>
          <div class="debug-actions"><button class="debug-secondary" type="button" data-restart-puzzle>Restart</button><button type="button" data-complete-puzzle>Complete</button></div>
          <p class="debug-help">Drag across cells to paint a connected group. Each new drag creates another group.</p>
          <div class="debug-scenario-grid" aria-label="Debug puzzle grouping grid"></div>
          <div class="debug-actions"><button class="debug-secondary" type="button" data-clear-scenario>Clear</button><button type="button" data-run-scenario>Build &amp; shuffle</button></div>
        </section>
      </aside>`;
    document.body.append(this.root);

    this.trigger = requiredElement(this.root, ".debug-trigger");
    this.drawer = requiredElement(this.root, ".debug-panel");
    this.closeButton = requiredElement(this.root, ".debug-close");
    this.progressForm = requiredElement(this.root, ".debug-progress-form");
    this.levelInput = requiredElement(this.root, '[name="level"]');
    this.pointsInput = requiredElement(this.root, '[name="points"]');
    this.resetProgressButton = requiredElement(this.root, "[data-reset-progress]");
    this.message = requiredElement(this.root, ".debug-message");
    this.puzzleSection = requiredElement(this.root, ".debug-puzzle");
    this.puzzleUnavailable = requiredElement(
      this.root,
      ".debug-puzzle-unavailable",
    );
    this.gridSizeSelect = requiredElement(this.root, '[name="grid-size"]');
    this.shapeSelect = requiredElement(this.root, '[name="tile-shape"]');
    this.movesInput = requiredElement(this.root, '[name="moves"]');
    this.starsInput = requiredElement(this.root, '[name="stars"]');
    this.timerInput = requiredElement(this.root, '[name="timer"]');
    this.restartPuzzleButton = requiredElement(
      this.root,
      "[data-restart-puzzle]",
    );
    this.completePuzzleButton = requiredElement(
      this.root,
      "[data-complete-puzzle]",
    );
    this.grid = requiredElement(this.root, ".debug-scenario-grid");
    this.clearButton = requiredElement(this.root, "[data-clear-scenario]");
    this.runButton = requiredElement(this.root, "[data-run-scenario]");

    this.trigger.addEventListener("click", this.toggle);
    this.closeButton.addEventListener("click", this.close);
    this.progressForm.addEventListener("submit", this.applyProgress);
    this.resetProgressButton.addEventListener("click", this.resetProgress);
    this.gridSizeSelect.addEventListener("change", this.resetGrid);
    this.movesInput.addEventListener("change", this.applyRuntimeValues);
    this.starsInput.addEventListener("change", this.applyRuntimeValues);
    this.timerInput.addEventListener("change", this.applyRuntimeValues);
    this.restartPuzzleButton.addEventListener("click", this.restartPuzzle);
    this.completePuzzleButton.addEventListener("click", this.completePuzzle);
    this.grid.addEventListener("pointerdown", this.startDrawing);
    document.addEventListener("pointermove", this.continueDrawing);
    document.addEventListener("pointerup", this.stopDrawing);
    document.addEventListener("pointercancel", this.stopDrawing);
    document.addEventListener("keydown", this.handleKeyDown);
    this.clearButton.addEventListener("click", this.clearGrid);
    this.runButton.addEventListener("click", this.runScenario);
    this.renderProgressValues();
  }

  setScene(scene: Scene): void {
    this.unsubscribePuzzleState?.();
    this.scene = scene;
    this.renderPuzzleState();
    this.unsubscribePuzzleState =
      scene.subscribeDebugPuzzleState?.(this.renderLivePuzzleState) ?? null;
  }

  destroy(): void {
    this.unsubscribePuzzleState?.();
    this.unsubscribePuzzleState = null;
    this.trigger.removeEventListener("click", this.toggle);
    this.closeButton.removeEventListener("click", this.close);
    this.progressForm.removeEventListener("submit", this.applyProgress);
    this.resetProgressButton.removeEventListener("click", this.resetProgress);
    this.gridSizeSelect.removeEventListener("change", this.resetGrid);
    this.movesInput.removeEventListener("change", this.applyRuntimeValues);
    this.starsInput.removeEventListener("change", this.applyRuntimeValues);
    this.timerInput.removeEventListener("change", this.applyRuntimeValues);
    this.restartPuzzleButton.removeEventListener("click", this.restartPuzzle);
    this.completePuzzleButton.removeEventListener("click", this.completePuzzle);
    this.grid.removeEventListener("pointerdown", this.startDrawing);
    document.removeEventListener("pointermove", this.continueDrawing);
    document.removeEventListener("pointerup", this.stopDrawing);
    document.removeEventListener("pointercancel", this.stopDrawing);
    document.removeEventListener("keydown", this.handleKeyDown);
    this.clearButton.removeEventListener("click", this.clearGrid);
    this.runButton.removeEventListener("click", this.runScenario);
    this.root.remove();
  }

  private toggle = () => {
    if (this.drawer.classList.contains("is-open")) this.close();
    else this.open();
  };

  private open = () => {
    this.renderProgressValues();
    this.renderPuzzleState(false);
    this.drawer.classList.add("is-open");
    this.drawer.setAttribute("aria-hidden", "false");
    this.trigger.setAttribute("aria-expanded", "true");
  };

  private close = () => {
    this.drawer.classList.remove("is-open");
    this.drawer.setAttribute("aria-hidden", "true");
    this.trigger.setAttribute("aria-expanded", "false");
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      event.code !== "KeyT" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      target?.matches("input, textarea, select, [contenteditable='true']")
    )
      return;
    event.preventDefault();
    this.toggle();
  };

  private applyProgress = (event: SubmitEvent) => {
    event.preventDefault();
    const level = Math.max(1, Math.trunc(this.levelInput.valueAsNumber || 1));
    const points = Math.max(0, Math.trunc(this.pointsInput.valueAsNumber || 0));
    const progress = levelProgressStore.setDebugProgress(level - 1, points);
    this.scene?.onDebugProgressChanged?.(progress);
    this.message.textContent = "Memory-only values applied.";
  };

  private resetProgress = async () => {
    levelProgressStore.clearDebugProgress();
    const progress = await levelProgressStore.load();
    this.renderProgressValues();
    this.scene?.onDebugProgressChanged?.(progress);
    this.message.textContent = "Saved progress restored.";
  };

  private renderProgressValues(): void {
    const progress = levelProgressStore.current;
    this.levelInput.value = String(progress.currentLevel + 1);
    this.pointsInput.value = String(progress.points);
  }

  private renderPuzzleState(resetGrid = true): void {
    const state = this.scene?.getDebugPuzzleState?.();
    this.puzzleSection.hidden = !state;
    this.puzzleUnavailable.hidden = Boolean(state);
    if (!state) return;
    this.gridSizeSelect.value = String(state.gridSize);
    this.shapeSelect.value = state.tileShape;
    this.movesInput.value = String(state.moves);
    this.starsInput.max = String(state.maximumStars);
    this.starsInput.value = String(state.stars);
    this.timerInput.value = String(state.timeRemaining);
    if (resetGrid) this.resetGrid();
  }

  private renderLivePuzzleState = (
    state: ReturnType<NonNullable<DebugSceneTarget["getDebugPuzzleState"]>>,
  ) => {
    this.updateLiveInput(this.movesInput, state.moves);
    this.starsInput.max = String(state.maximumStars);
    this.updateLiveInput(this.starsInput, state.stars);
    this.updateLiveInput(this.timerInput, state.timeRemaining);
  };

  private updateLiveInput(input: HTMLInputElement, value: number): void {
    if (document.activeElement !== input) input.value = String(value);
  }

  private applyRuntimeValues = (event: Event) => {
    const values = this.runtimeValues();
    const target = event.currentTarget;
    if (target === this.movesInput)
      this.scene?.applyDebugPuzzleRuntime?.({ moves: values.moves });
    if (target === this.starsInput)
      this.scene?.applyDebugPuzzleRuntime?.({ stars: values.stars });
    if (target === this.timerInput)
      this.scene?.applyDebugPuzzleRuntime?.({
        timeRemaining: values.timeRemaining,
      });
  };

  private restartPuzzle = () => this.scene?.restartDebugPuzzle?.();

  private completePuzzle = () => this.scene?.completeDebugPuzzle?.();

  private resetGrid = () => {
    const size = this.selectedGridSize();
    this.cells = Array<number | null>(size * size).fill(null);
    this.nextGroup = 1;
    this.renderGrid();
  };

  private clearGrid = () => this.resetGrid();

  private renderGrid(): void {
    const size = this.selectedGridSize();
    this.grid.style.setProperty("--debug-grid-size", String(size));
    this.grid.replaceChildren(
      ...this.cells.map((group, slot) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.dataset.slot = String(slot);
        cell.className = "debug-grid-cell";
        cell.setAttribute("aria-label", `Puzzle cell ${slot + 1}`);
        if (group !== null) {
          cell.dataset.group = String(group);
          cell.textContent = String(group);
          cell.style.setProperty(
            "--debug-group-color",
            groupColors[(group - 1) % groupColors.length],
          );
        }
        return cell;
      }),
    );
  }

  private startDrawing = (event: PointerEvent) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      ".debug-grid-cell",
    );
    if (!cell || event.button !== 0) return;
    event.preventDefault();
    this.drawingGroup = this.nextGroup;
    this.nextGroup += 1;
    this.drawingPointer = event.pointerId;
    this.paintCell(cell);
  };

  private continueDrawing = (event: PointerEvent) => {
    if (
      this.drawingGroup === null ||
      this.drawingPointer !== event.pointerId
    )
      return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const cell = target?.closest<HTMLElement>(".debug-grid-cell");
    if (cell && this.grid.contains(cell)) this.paintCell(cell);
  };

  private stopDrawing = (event: PointerEvent) => {
    if (event.pointerId !== this.drawingPointer) return;
    this.drawingGroup = null;
    this.drawingPointer = null;
  };

  private paintCell(cell: HTMLElement): void {
    const slot = Number(cell.dataset.slot);
    if (!Number.isInteger(slot) || this.drawingGroup === null) return;
    this.cells[slot] = this.drawingGroup;
    cell.dataset.group = String(this.drawingGroup);
    cell.textContent = String(this.drawingGroup);
    cell.style.setProperty(
      "--debug-group-color",
      groupColors[(this.drawingGroup - 1) % groupColors.length],
    );
  }

  private runScenario = () => {
    if (!this.scene?.applyDebugPuzzleScenario) return;
    this.scene.applyDebugPuzzleScenario({
      gridSize: this.selectedGridSize(),
      tileShape: this.shapeSelect.value as TileShapeTypes,
      ...this.runtimeValues(),
      groups: debugGroupsFromCells(this.cells),
    });
  };

  private runtimeValues() {
    return {
      moves: Math.max(0, Math.trunc(this.movesInput.valueAsNumber || 0)),
      stars: Math.max(0, Math.trunc(this.starsInput.valueAsNumber || 0)),
      timeRemaining: Math.max(
        0,
        Math.trunc(this.timerInput.valueAsNumber || 0),
      ),
    };
  }

  private selectedGridSize(): GridSize {
    return Number(this.gridSizeSelect.value) as GridSize;
  }
}
