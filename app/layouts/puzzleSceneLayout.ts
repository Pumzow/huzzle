import { appHeaderMarkup } from "../components/common/appHeader";
import { completionModalMarkup } from "../components/puzzle/completionModal";
import { puzzleControlsMarkup } from "../components/puzzle/puzzleControls";
import { puzzleHUDMarkup } from "../components/puzzle/puzzleHUD";
import {
  targetHintButtonMarkup,
  targetHintOverlayMarkup,
} from "../components/puzzle/targetHint";
import {
  closeAnimatedDialog,
  showAnimatedDialog,
} from "../effects/dialogEffects";
import type { GridSize, TileShapeTypes } from "../types/gameTypes";
import type { PuzzleSceneConfig } from "../types/puzzleSceneTypes";
import { requiredElement } from "../utils/dom";

export function boardAspectFor(
  tileShape: TileShapeTypes,
  gridSize: GridSize,
): number {
  if (tileShape === "card") return 3 / 4;
  const staggeredSpan = 0.75 * gridSize + 0.25;
  const hexSpan = (Math.sqrt(3) / 2) * (gridSize + 0.5);
  if (tileShape === "hexagon") return staggeredSpan / hexSpan;
  if (tileShape === "verticalHexagon") return hexSpan / staggeredSpan;
  return 1;
}

export class PuzzleSceneLayout {
  readonly canvasHost: HTMLDivElement | null;
  readonly canvasWrap: HTMLElement | null;
  private readonly workspace: HTMLElement;
  private readonly puzzleColumn: HTMLElement;
  private readonly toolbar: HTMLElement | null;
  private readonly actions: HTMLElement;
  private readonly settingsDialog: HTMLDialogElement | null;
  private readonly settingsButton: HTMLButtonElement | null;
  private readonly settingsCloseButton: HTMLButtonElement | null;
  private readonly resizeObserver: ResizeObserver;
  private readonly levelLabel: HTMLElement;
  private tileShape: TileShapeTypes;
  private gridSize: GridSize;

  constructor(
    private readonly root: HTMLElement,
    private readonly config: PuzzleSceneConfig,
    currentLevelId: number | undefined,
    tileShape: TileShapeTypes,
    gridSize: GridSize,
  ) {
    this.tileShape = tileShape;
    this.gridSize = gridSize;
    root.innerHTML = this.markup(currentLevelId);
    this.levelLabel = requiredElement(root, "[data-level-label]");
    this.workspace = requiredElement(root, ".workspace");
    this.puzzleColumn = requiredElement(root, ".puzzle-column");
    this.toolbar = root.querySelector(".game-toolbar");
    this.actions = requiredElement(root, ".board-actions");
    this.canvasHost = config.components.board.enabled
      ? requiredElement<HTMLDivElement>(root, ".canvas-host")
      : null;
    this.canvasWrap = config.components.board.enabled
      ? requiredElement<HTMLElement>(root, ".canvas-wrap")
      : null;
    this.settingsDialog = root.querySelector(".puzzle-settings-dialog");
    this.settingsButton = root.querySelector("[data-settings-open]");
    this.settingsCloseButton = root.querySelector("[data-settings-close]");
    this.settingsButton?.addEventListener("click", this.openSettings);
    this.settingsCloseButton?.addEventListener("click", this.closeSettings);
    this.settingsDialog?.addEventListener("click", this.closeFromBackdrop);
    this.resizeObserver = new ResizeObserver(this.layoutPuzzleColumn);
    this.resizeObserver.observe(this.workspace);
    this.updateBoardLayout(tileShape, gridSize);
    requestAnimationFrame(this.layoutPuzzleColumn);
  }

  updateBoardLayout(tileShape: TileShapeTypes, gridSize: GridSize): void {
    this.tileShape = tileShape;
    this.gridSize = gridSize;
    if (this.canvasWrap) {
      this.canvasWrap.dataset.tileShape = tileShape;
      this.canvasWrap.style.setProperty(
        "--board-aspect",
        String(boardAspectFor(tileShape, gridSize)),
      );
    }
    this.puzzleColumn.dataset.tileShape = tileShape;
    requestAnimationFrame(this.layoutPuzzleColumn);
  }

  renderLevelLabel(levelId: number): void {
    this.levelLabel.textContent = `LEVEL ${levelId + 1}`;
  }

  renderOfflineLevelLabel(levelIndex: number): void {
    this.levelLabel.textContent = `OFFLINE ${levelIndex + 1}`;
  }

  closeSettingsPanel(): void {
    this.closeSettings();
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.settingsButton?.removeEventListener("click", this.openSettings);
    this.settingsCloseButton?.removeEventListener("click", this.closeSettings);
    this.settingsDialog?.removeEventListener("click", this.closeFromBackdrop);
  }

  private readonly layoutPuzzleColumn = (): void => {
    const style = getComputedStyle(this.actions);
    const actionsHeight =
      this.actions.offsetHeight +
      Number.parseFloat(style.marginTop) +
      Number.parseFloat(style.marginBottom);
    const boardHeight = Math.max(
      0,
      this.workspace.clientHeight -
        actionsHeight -
        (this.toolbar?.offsetHeight ?? 0),
    );
    const desiredWidth =
      Math.ceil(boardHeight * boardAspectFor(this.tileShape, this.gridSize)) + 2;
    this.puzzleColumn.style.width = `${Math.min(
      this.workspace.clientWidth,
      desiredWidth,
    )}px`;
  };

  private readonly openSettings = (): void => {
    if (this.settingsDialog) showAnimatedDialog(this.settingsDialog);
  };

  private readonly closeSettings = (): void => {
    if (this.settingsDialog) closeAnimatedDialog(this.settingsDialog);
  };

  private readonly closeFromBackdrop = (event: MouseEvent): void => {
    if (event.target === this.settingsDialog) this.closeSettings();
  };

  private markup(currentLevelId: number | undefined): string {
    const components = this.config.components;
    const header = components.header.enabled ? appHeaderMarkup(true) : "";
    const hud = components.hud.enabled ? puzzleHUDMarkup(components.hud) : "";
    const completion = components.completionModal.enabled
      ? completionModalMarkup(components.completionModal)
      : "";
    const hintEnabled =
      components.board.enabled && components.targetHint.enabled;
    const hintButton = hintEnabled ? targetHintButtonMarkup() : "";
    const hintOverlay = hintEnabled ? targetHintOverlayMarkup() : "";
    const board = components.board.enabled
      ? `<div class="canvas-wrap"><div class="canvas-host"></div>${hintOverlay}${completion}</div>`
      : "";
    const controls = components.controls.enabled
      ? puzzleControlsMarkup({
          ...components.controls,
          enabledShapes: this.config.enabledShapes,
        })
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
      ? currentLevelId === undefined
        ? "LEVEL ..."
        : `LEVEL ${currentLevelId + 1}`
      : "CUSTOM LEVEL";

    return `<main class="shell puzzle-shell">
      ${header}
      <section class="workspace" aria-label="Picture puzzle workspace">
        <div class="puzzle-column"><div class="board-actions"><p class="level-label" data-level-label>${levelLabel}</p><div class="board-action-buttons">${hintButton}${settingsButton}</div></div><div class="game-card">${hud}${board}</div></div>
      </section>
      ${settingsDialog}
    </main>`;
  }
}
