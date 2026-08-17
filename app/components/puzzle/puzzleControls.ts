import { gameConfig } from "../../config/gameConfig";
import { GridSize, TileShape } from "../../types/gameTypes";

type PuzzleControlOptions = {
  allowImageUpload: boolean;
  allowShapeSelection: boolean;
  allowGridSelection: boolean;
  allowRestart: boolean;
};

type PuzzleControlEvents = {
  onImageUpload: (file: File) => void;
  onShapeChange: (shape: TileShape) => void;
  onGridChange: (size: GridSize) => void;
  onRestart: () => void;
};

function shapeIcon(shape: TileShape): string {
  const element = shape === "square"
    ? '<rect x="4" y="4" width="16" height="16" />'
    : shape === "hexagon"
      ? '<polygon points="7,3 17,3 22,12 17,21 7,21 2,12" />'
      : '<polygon points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8" />';
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${element}</svg>`;
}

export function puzzleControlsMarkup(options: PuzzleControlOptions): string {
  const upload = options.allowImageUpload ? '<label class="upload-button">Upload image<input type="file" accept="image/*" /></label>' : "";
  const shapes = options.allowShapeSelection
    ? `<fieldset class="shape-picker"><legend>Piece shape</legend><div>${gameConfig.pieces.shapes.map(({ value, label }) => `<button type="button" data-shape="${value}">${shapeIcon(value)}<span>${label}</span></button>`).join("")}</div></fieldset>`
    : "";
  const grids = options.allowGridSelection
    ? `<fieldset class="grid-picker"><legend>Grid size</legend><div>${gameConfig.grid.sizes.map((size) => `<button type="button" data-grid="${size}">${size} × ${size}</button>`).join("")}</div></fieldset>`
    : "";
  const restart = options.allowRestart ? '<button class="primary-button" type="button" data-restart>Shuffle puzzle</button>' : "";
  return `${upload}${shapes}${grids}${restart}`;
}

export class PuzzleControls {
  private readonly removers: Array<() => void> = [];

  constructor(private readonly root: ParentNode, private readonly options: PuzzleControlOptions, events: PuzzleControlEvents) {
    const input = root.querySelector<HTMLInputElement>(".upload-button input");
    if (input) {
      const listener = () => {
        const file = input.files?.[0];
        if (file?.type.startsWith("image/")) events.onImageUpload(file);
        input.value = "";
      };
      input.addEventListener("change", listener);
      this.removers.push(() => input.removeEventListener("change", listener));
    }
    root.querySelectorAll<HTMLButtonElement>("[data-shape]").forEach((button) => {
      const listener = () => events.onShapeChange(button.dataset.shape as TileShape);
      button.addEventListener("click", listener);
      this.removers.push(() => button.removeEventListener("click", listener));
    });
    root.querySelectorAll<HTMLButtonElement>("[data-grid]").forEach((button) => {
      const listener = () => events.onGridChange(Number(button.dataset.grid) as GridSize);
      button.addEventListener("click", listener);
      this.removers.push(() => button.removeEventListener("click", listener));
    });
    const restart = root.querySelector<HTMLButtonElement>("[data-restart]");
    if (restart) {
      restart.addEventListener("click", events.onRestart);
      this.removers.push(() => restart.removeEventListener("click", events.onRestart));
    }
  }

  update(gridSize: GridSize, tileShape: TileShape): void {
    if (this.options.allowShapeSelection) this.root.querySelectorAll<HTMLButtonElement>("[data-shape]").forEach((button) => {
      const active = button.dataset.shape === tileShape;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (this.options.allowGridSelection) this.root.querySelectorAll<HTMLButtonElement>("[data-grid]").forEach((button) => {
      const active = Number(button.dataset.grid) === gridSize;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  destroy(): void {
    this.removers.forEach((remove) => remove());
  }
}
