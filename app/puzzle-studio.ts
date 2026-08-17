import { GridSize, mountPixiPuzzle, PuzzleProgress, TileShape } from "./pixi-puzzle";
import { soundManager } from "./sound-manager";

type Theme = "light" | "dark";

const GRID_OPTIONS: GridSize[] = [4, 6, 8];
const SHAPE_OPTIONS: Array<{ value: TileShape; label: string }> = [
  { value: "square", label: "Square" },
  { value: "hexagon", label: "Hexagon" },
  { value: "octagon", label: "Octagon" },
];
const THEME_STORAGE_KEY = "huzzle-theme";
const SOUNDTRACK = `${import.meta.env.BASE_URL}sounds/huzzle-soundtrack.wav`;

function emptyProgress(gridSize: GridSize): PuzzleProgress {
  return { moves: 0, groups: gridSize * gridSize, won: false, startingGroups: 0, moveLimit: 0 };
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getInitialTheme(): Theme {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  } catch {
    // Browsers can disable storage; the system preference remains a safe fallback.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function makeSampleImage(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, 1200);
  sky.addColorStop(0, "#a9d8d5");
  sky.addColorStop(.57, "#f4d6a0");
  sky.addColorStop(1, "#e97b55");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1200, 1200);
  ctx.fillStyle = "#fff4c7";
  ctx.beginPath();
  ctx.arc(890, 245, 116, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6a9b8b";
  ctx.beginPath();
  ctx.moveTo(0, 710); ctx.lineTo(290, 365); ctx.lineTo(520, 690); ctx.lineTo(745, 410); ctx.lineTo(1200, 770); ctx.lineTo(1200, 1200); ctx.lineTo(0, 1200); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2e6962";
  ctx.beginPath();
  ctx.moveTo(0, 840); ctx.lineTo(220, 635); ctx.lineTo(390, 785); ctx.lineTo(620, 570); ctx.lineTo(825, 790); ctx.lineTo(1040, 600); ctx.lineTo(1200, 730); ctx.lineTo(1200, 1200); ctx.lineTo(0, 1200); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#163f42";
  ctx.fillRect(0, 930, 1200, 270);
  [80, 180, 310, 455, 620, 790, 950, 1080].forEach((x, index) => {
    const y = 850 + (index % 3) * 32;
    ctx.fillStyle = index % 2 ? "#173f42" : "#245b58";
    for (let tier = 0; tier < 3; tier++) {
      ctx.beginPath();
      ctx.moveTo(x, y - 230 + tier * 70);
      ctx.lineTo(x - 92 + tier * 15, y - 55 + tier * 48);
      ctx.lineTo(x + 92 - tier * 15, y - 55 + tier * 48);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(x - 10, y - 20, 20, 120);
  });
  ctx.fillStyle = "rgba(255,255,255,.42)";
  ctx.beginPath(); ctx.moveTo(290, 365); ctx.lineTo(215, 495); ctx.lineTo(318, 430); ctx.lineTo(376, 490); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(745, 410); ctx.lineTo(661, 540); ctx.lineTo(748, 494); ctx.lineTo(817, 560); ctx.closePath(); ctx.fill();
  return canvas.toDataURL("image/jpeg", .92);
}

function shapeIcon(shape: TileShape): string {
  const shapeElement = shape === "square"
    ? '<rect x="4" y="4" width="16" height="16" />'
    : shape === "hexagon"
      ? '<polygon points="7,3 17,3 22,12 17,21 7,21 2,12" />'
      : '<polygon points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8" />';
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${shapeElement}</svg>`;
}

function soundIcon(muted: boolean): string {
  const waves = muted
    ? '<path d="m16 9 5 6M21 9l-5 6"/>'
    : '<path d="M15 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>';
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z"/>${waves}</svg>`;
}

function themeIcon(theme: Theme): string {
  return theme === "light"
    ? '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.3 15.2A8.5 8.5 0 0 1 8.8 3.7 8.5 8.5 0 1 0 20.3 15.2Z"/></svg>'
    : '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3V1.5M12 22.5V21M4.22 4.22 3.16 3.16M20.84 20.84l-1.06-1.06M3 12H1.5M22.5 12H21M4.22 19.78l-1.06 1.06M20.84 3.16l-1.06 1.06"/><circle cx="12" cy="12" r="4.5"/></svg>';
}

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing application element: ${selector}`);
  return element;
}

export class PuzzleStudio {
  private imageUrl = makeSampleImage();
  private gridSize: GridSize = 4;
  private tileShape: TileShape = "square";
  private progress = emptyProgress(4);
  private theme = getInitialTheme();
  private soundMuted = false;
  private elapsedSeconds = 0;
  private gameStarted = false;
  private targetRevealed = false;
  private objectUrl: string | null = null;
  private timerStartedAt: number | null = null;
  private timerId: number | null = null;
  private destroyPuzzle: (() => void) | null = null;

  private readonly canvasHost: HTMLDivElement;
  private readonly movesValue: HTMLElement;
  private readonly starStat: HTMLElement;
  private readonly starsElement: HTMLElement;
  private readonly timerElement: HTMLElement;
  private readonly timerLabel: HTMLElement;
  private readonly timerValue: HTMLElement;
  private readonly winCard: HTMLElement;
  private readonly winStars: HTMLElement;
  private readonly winMessage: HTMLElement;
  private readonly previewButton: HTMLButtonElement;
  private readonly previewImage: HTMLImageElement;
  private readonly previewCover: HTMLElement;
  private readonly previewCoverTitle: HTMLElement;
  private readonly previewCost: HTMLElement;
  private readonly soundButton: HTMLButtonElement;
  private readonly themeButton: HTMLButtonElement;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = this.shellMarkup();
    this.canvasHost = requiredElement(root, ".canvas-host");
    this.movesValue = requiredElement(root, "[data-moves]");
    this.starStat = requiredElement(root, ".star-stat");
    this.starsElement = requiredElement(root, ".stars");
    this.timerElement = requiredElement(root, ".timer");
    this.timerLabel = requiredElement(root, "[data-timer-label]");
    this.timerValue = requiredElement(root, "[data-timer-value]");
    this.winCard = requiredElement(root, ".win-card");
    this.winStars = requiredElement(root, ".win-stars");
    this.winMessage = requiredElement(root, "[data-win-message]");
    this.previewButton = requiredElement(root, ".preview-frame");
    this.previewImage = requiredElement(root, ".preview-frame img");
    this.previewCover = requiredElement(root, ".preview-cover");
    this.previewCoverTitle = requiredElement(root, ".preview-cover strong");
    this.previewCost = requiredElement(root, ".preview-cover small");
    this.soundButton = requiredElement(root, ".sound-toggle");
    this.themeButton = requiredElement(root, ".theme-toggle");
    this.bindEvents();
    this.applyTheme();
    soundManager.playSound(SOUNDTRACK, true);
    this.updateUi();
    this.createPuzzle();
    window.addEventListener("pagehide", () => this.destroy(), { once: true });
  }

  private shellMarkup(): string {
    const shapeButtons = SHAPE_OPTIONS.map(({ value, label }) => `<button type="button" data-shape="${value}">${shapeIcon(value)}<span>${label}</span></button>`).join("");
    const gridButtons = GRID_OPTIONS.map((size) => `<button type="button" data-grid="${size}">${size} × ${size}</button>`).join("");
    return `<main class="shell">
      <header class="topbar">
        <div class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><strong class="brand-name">Huzzle</strong></div>
        <div class="topbar-actions">
          <button class="sound-toggle" type="button"></button>
          <button class="theme-toggle" type="button"></button>
        </div>
      </header>
      <section class="hero"><div><p class="eyebrow">Swap · connect · complete</p></div></section>
      <section class="workspace" aria-label="Picture puzzle workspace">
        <div class="game-card">
          <div class="game-toolbar">
            <div class="game-stats"><div class="stat"><span>Moves</span><strong data-moves></strong></div></div>
            <div class="star-stat"><span>Stars</span><div class="stars" aria-hidden="true"></div></div>
            <div class="timer"><span data-timer-label></span><strong data-timer-value></strong></div>
          </div>
          <div class="canvas-wrap">
            <div class="canvas-host"></div>
            <div class="win-card" role="status" hidden><div class="win-stars"></div><strong data-win-message></strong></div>
          </div>
        </div>
        <aside class="side-panel">
          <button class="preview-frame" type="button">
            <img alt="" />
            <span class="preview-cover"><strong>Reveal target</strong><small aria-hidden="true">−★</small></span>
            <span class="preview-label">Target image</span>
          </button>
          <label class="upload-button">Upload image<input type="file" accept="image/*" /></label>
          <fieldset class="shape-picker"><legend>Piece shape</legend><div>${shapeButtons}</div></fieldset>
          <fieldset class="grid-picker"><legend>Grid size</legend><div>${gridButtons}</div></fieldset>
          <button class="primary-button" type="button" data-restart>Shuffle puzzle</button>
        </aside>
      </section>
    </main>`;
  }

  private bindEvents(): void {
    this.soundButton.addEventListener("click", () => {
      this.soundMuted = !this.soundMuted;
      soundManager.setMuted(this.soundMuted);
      this.updateHeaderControls();
    });
    this.themeButton.addEventListener("click", () => {
      this.theme = this.theme === "light" ? "dark" : "light";
      this.applyTheme();
    });
    this.previewButton.addEventListener("click", () => {
      if (this.targetRevealed || this.progress.won) return;
      this.targetRevealed = true;
      this.updateUi();
    });
    requiredElement<HTMLInputElement>(this.root, '.upload-button input').addEventListener("change", (event) => this.handleUpload(event));
    this.root.querySelectorAll<HTMLButtonElement>("[data-shape]").forEach((button) => button.addEventListener("click", () => {
      this.changeTileShape(button.dataset.shape as TileShape);
    }));
    this.root.querySelectorAll<HTMLButtonElement>("[data-grid]").forEach((button) => button.addEventListener("click", () => {
      this.changeGridSize(Number(button.dataset.grid) as GridSize);
    }));
    requiredElement<HTMLButtonElement>(this.root, "[data-restart]").addEventListener("click", () => this.resetChallenge(this.gridSize));
  }

  private applyTheme(): void {
    document.documentElement.dataset.theme = this.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", this.theme === "dark" ? "#101b1c" : "#f5f1e8");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, this.theme);
    } catch {
      // Theme selection still works for this session when storage is unavailable.
    }
    this.updateHeaderControls();
  }

  private updateHeaderControls(): void {
    this.soundButton.setAttribute("aria-label", this.soundMuted ? "Unmute soundtrack" : "Mute soundtrack");
    this.soundButton.setAttribute("aria-pressed", String(this.soundMuted));
    this.soundButton.innerHTML = `${soundIcon(this.soundMuted)}<span>${this.soundMuted ? "Sound off" : "Sound on"}</span>`;
    this.themeButton.setAttribute("aria-label", `Switch to ${this.theme === "light" ? "dark" : "light"} mode`);
    this.themeButton.setAttribute("aria-pressed", String(this.theme === "dark"));
    this.themeButton.innerHTML = `${themeIcon(this.theme)}<span>${this.theme === "light" ? "Dark mode" : "Light mode"}</span>`;
  }

  private get timeLimitSeconds(): number {
    return this.progress.startingGroups ? 20 + this.progress.startingGroups * 7 : 0;
  }

  private get timeExpired(): boolean {
    return this.timeLimitSeconds > 0 && this.elapsedSeconds > this.timeLimitSeconds;
  }

  private get stars(): number {
    const moveLimitExceeded = this.progress.moveLimit > 0 && this.progress.moves > this.progress.moveLimit;
    return 3 - Number(this.timeExpired) - Number(this.targetRevealed) - Number(moveLimitExceeded);
  }

  private updateUi(): void {
    const stars = this.stars;
    const displayedTime = this.timeExpired ? this.elapsedSeconds - this.timeLimitSeconds : Math.max(0, this.timeLimitSeconds - this.elapsedSeconds);
    this.movesValue.innerHTML = `${String(this.progress.moves).padStart(2, "0")} <small>/ ${this.progress.moveLimit || "—"}</small>`;
    this.starStat.setAttribute("aria-label", `${stars} of 3 stars remaining`);
    this.starsElement.innerHTML = [0, 1, 2].map((star) => `<i class="${star < stars ? "is-earned" : ""}">★</i>`).join("");
    this.timerElement.classList.toggle("is-expired", this.timeExpired);
    this.timerLabel.textContent = this.timeExpired ? "Over time" : this.gameStarted ? "Time left" : "Timer";
    this.timerValue.textContent = `${this.timeExpired ? "+" : ""}${formatTime(displayedTime)}`;

    const completionMessage = stars === 3 ? "Excellent!" : stars === 2 ? "Well done!" : "Puzzle completed!";
    this.winCard.hidden = !this.progress.won;
    this.winStars.setAttribute("aria-label", `${stars} out of 3 stars`);
    this.winStars.innerHTML = `${"★".repeat(stars)}<span>${"★".repeat(3 - stars)}</span>`;
    this.winMessage.textContent = completionMessage;

    this.previewImage.src = this.imageUrl;
    this.previewImage.alt = this.targetRevealed ? "Preview of the completed puzzle" : "";
    this.previewButton.classList.toggle("is-revealed", this.targetRevealed);
    this.previewButton.disabled = this.targetRevealed || this.progress.won;
    this.previewButton.setAttribute("aria-label", this.targetRevealed
      ? "Target image revealed"
      : this.progress.won ? "Target image unavailable after completion" : "Reveal target image for a one-star penalty");
    this.previewCover.hidden = this.targetRevealed;
    this.previewCoverTitle.textContent = this.progress.won ? "Puzzle complete" : "Reveal target";
    this.previewCost.hidden = this.progress.won;

    this.root.querySelectorAll<HTMLButtonElement>("[data-shape]").forEach((button) => {
      const active = button.dataset.shape === this.tileShape;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-grid]").forEach((button) => {
      const active = Number(button.dataset.grid) === this.gridSize;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  private createPuzzle(): void {
    this.destroyPuzzle?.();
    this.canvasHost.setAttribute("aria-label", `Interactive ${this.tileShape} ${this.gridSize} by ${this.gridSize} tile-swapping picture puzzle`);
    this.destroyPuzzle = mountPixiPuzzle(this.canvasHost, {
      imageUrl: this.imageUrl,
      gridSize: this.gridSize,
      tileShape: this.tileShape,
      onProgress: (progress) => {
        this.progress = progress;
        if (progress.won) this.stopTimer();
        this.updateUi();
      },
      onStart: () => this.startTimer(),
    });
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
    this.updateUi();
  }

  private stopTimer(): void {
    if (this.timerId !== null) window.clearInterval(this.timerId);
    this.timerId = null;
  }

  private changeGridSize(size: GridSize): void {
    if (size === this.gridSize) return;
    this.gridSize = size;
    this.resetChallenge(size);
  }

  private changeTileShape(shape: TileShape): void {
    if (shape === this.tileShape) return;
    this.tileShape = shape;
    this.resetChallenge(this.gridSize);
  }

  private resetChallenge(size: GridSize): void {
    this.stopTimer();
    this.timerStartedAt = null;
    this.elapsedSeconds = 0;
    this.gameStarted = false;
    this.targetRevealed = false;
    this.progress = emptyProgress(size);
    this.updateUi();
    this.createPuzzle();
  }

  private handleUpload(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(file);
    this.imageUrl = this.objectUrl;
    this.resetChallenge(this.gridSize);
    input.value = "";
  }

  destroy(): void {
    this.stopTimer();
    this.destroyPuzzle?.();
    soundManager.stopSound(SOUNDTRACK);
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}

export function mountPuzzleStudio(root: HTMLElement): PuzzleStudio {
  return new PuzzleStudio(root);
}
