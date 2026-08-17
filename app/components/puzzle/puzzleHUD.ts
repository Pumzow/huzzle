export type PuzzleHUDState = {
  moves: number;
  moveLimit: number;
  stars: number;
  startingStars: number;
  displayedSeconds: number;
  gameStarted: boolean;
  timeExpired: boolean;
};

type PuzzleHUDOptions = {
  showMoves: boolean;
  showTimer: boolean;
  showStars: boolean;
};

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function puzzleHUDMarkup(options: PuzzleHUDOptions): string {
  const moves = options.showMoves ? '<div class="game-stats"><div class="stat"><span>Moves</span><strong data-moves></strong></div></div>' : "";
  const stars = options.showStars ? '<div class="star-stat"><span>Stars</span><div class="stars" aria-hidden="true"></div></div>' : "";
  const timer = options.showTimer ? '<div class="timer"><span data-timer-label></span><strong data-timer-value></strong></div>' : "";
  return `<div class="game-toolbar">${moves}${stars}${timer}</div>`;
}

export class PuzzleHUD {
  constructor(private readonly root: ParentNode, private readonly options: PuzzleHUDOptions) {}

  update(state: PuzzleHUDState): void {
    if (this.options.showMoves) {
      const moves = this.root.querySelector<HTMLElement>("[data-moves]");
      if (moves) moves.innerHTML = `${String(state.moves).padStart(2, "0")} <small>/ ${state.moveLimit || "—"}</small>`;
    }
    if (this.options.showStars) {
      const stat = this.root.querySelector<HTMLElement>(".star-stat");
      const stars = this.root.querySelector<HTMLElement>(".stars");
      stat?.setAttribute("aria-label", `${state.stars} of ${state.startingStars} stars remaining`);
      if (stars) stars.innerHTML = Array.from({ length: state.startingStars }, (_, index) => `<i class="${index < state.stars ? "is-earned" : ""}">★</i>`).join("");
    }
    if (this.options.showTimer) {
      const timer = this.root.querySelector<HTMLElement>(".timer");
      const label = this.root.querySelector<HTMLElement>("[data-timer-label]");
      const value = this.root.querySelector<HTMLElement>("[data-timer-value]");
      timer?.classList.toggle("is-expired", state.timeExpired);
      if (label) label.textContent = state.timeExpired ? "Over time" : state.gameStarted ? "Time left" : "Timer";
      if (value) value.textContent = `${state.timeExpired ? "+" : ""}${formatTime(state.displayedSeconds)}`;
    }
  }
}
