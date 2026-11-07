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
  intro: {
    enabled: boolean;
    holdDuration: number;
    transitionDuration: number;
  };
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
  const toolbarClass = options.showStars
    ? "game-toolbar"
    : "game-toolbar game-toolbar--without-stars";
  const introMoves = options.showMoves
    ? '<div class="hud-intro-stat" data-hud-intro-moves><span>Moves</span><strong data-hud-intro-moves-value></strong></div>'
    : "";
  const introTimer = options.showTimer
    ? '<div class="hud-intro-stat" data-hud-intro-timer><span>Time</span><strong data-hud-intro-timer-value></strong></div>'
    : "";
  const intro = options.intro.enabled && (introMoves || introTimer)
    ? `<div class="hud-intro" data-hud-intro aria-hidden="true" hidden><div class="hud-intro-content">${introMoves}${introTimer}</div></div>`
    : "";
  return `<div class="${toolbarClass}">${moves}${stars}${timer}</div>${intro}`;
}

export class PuzzleHUD {
  private holdTimeout: ReturnType<typeof globalThis.setTimeout> | null = null;
  private finishTimeout: ReturnType<typeof globalThis.setTimeout> | null = null;
  private animations: Animation[] = [];
  private introActive = false;

  constructor(private readonly root: ParentNode, private readonly options: PuzzleHUDOptions) {}

  update(state: PuzzleHUDState): void {
    if (this.options.showMoves) {
      const moves = this.root.querySelector<HTMLElement>("[data-moves]");
      if (moves) moves.innerHTML = `${String(state.moves).padStart(2, "0")} <small>/ ${state.moveLimit || "—"}</small>`;
      const introMoves = this.root.querySelector<HTMLElement>("[data-hud-intro-moves-value]");
      if (introMoves) introMoves.innerHTML = `${String(state.moves).padStart(2, "0")} <small>/ ${state.moveLimit || "—"}</small>`;
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
      const introTimer = this.root.querySelector<HTMLElement>("[data-hud-intro-timer-value]");
      if (introTimer) introTimer.textContent = `${state.timeExpired ? "+" : ""}${formatTime(state.displayedSeconds)}`;
    }
  }

  playIntro(): void {
    if (!this.options.intro.enabled) return;
    const intro = this.root.querySelector<HTMLElement>("[data-hud-intro]");
    const toolbar = this.root.querySelector<HTMLElement>(".game-toolbar");
    if (!intro || !toolbar) return;

    this.cancelIntro();
    this.introActive = true;
    intro.hidden = false;
    intro.classList.remove("is-settling");
    toolbar.classList.add("is-intro-active");
    this.holdTimeout = globalThis.setTimeout(
      () => this.settleIntro(),
      Math.max(0, this.options.intro.holdDuration) * 1000,
    );
  }

  completeIntro(): void {
    if (!this.introActive) return;
    if (this.holdTimeout !== null) globalThis.clearTimeout(this.holdTimeout);
    this.holdTimeout = null;
    this.settleIntro();
  }

  destroy(): void {
    this.cancelIntro();
  }

  private settleIntro(): void {
    if (!this.introActive || this.finishTimeout !== null) return;
    this.holdTimeout = null;
    const intro = this.root.querySelector<HTMLElement>("[data-hud-intro]");
    const toolbar = this.root.querySelector<HTMLElement>(".game-toolbar");
    if (!intro || !toolbar) {
      this.cancelIntro();
      return;
    }

    const reducedMotion = globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches ?? false;
    const duration = reducedMotion
      ? 0
      : Math.max(0, this.options.intro.transitionDuration) * 1000;
    intro.classList.add("is-settling");
    toolbar.classList.add("is-intro-settling");

    this.animateStat("[data-hud-intro-moves]", ".stat", duration);
    this.animateStat("[data-hud-intro-timer]", ".timer", duration);
    this.finishTimeout = globalThis.setTimeout(
      () => this.finishIntro(),
      duration,
    );
  }

  private animateStat(
    introSelector: string,
    targetSelector: string,
    duration: number,
  ): void {
    if (duration === 0) return;
    const source = this.root.querySelector<HTMLElement>(introSelector);
    const target = this.root.querySelector<HTMLElement>(targetSelector);
    if (!source || !target) return;
    const sourceBounds = source.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    const translateX =
      targetBounds.left + targetBounds.width / 2 -
      (sourceBounds.left + sourceBounds.width / 2);
    const translateY =
      targetBounds.top + targetBounds.height / 2 -
      (sourceBounds.top + sourceBounds.height / 2);
    const scale = Math.min(
      1,
      targetBounds.width / Math.max(1, sourceBounds.width),
      targetBounds.height / Math.max(1, sourceBounds.height),
    );
    this.animations.push(source.animate([
      { opacity: 1, transform: "translate(0, 0) scale(1)" },
      {
        opacity: .15,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      },
    ], {
      duration,
      easing: "cubic-bezier(.22, 1, .36, 1)",
      fill: "forwards",
    }));
  }

  private finishIntro(): void {
    const intro = this.root.querySelector<HTMLElement>("[data-hud-intro]");
    const toolbar = this.root.querySelector<HTMLElement>(".game-toolbar");
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
    if (intro) {
      intro.hidden = true;
      intro.classList.remove("is-settling");
    }
    toolbar?.classList.remove("is-intro-active", "is-intro-settling");
    this.finishTimeout = null;
    this.introActive = false;
  }

  private cancelIntro(): void {
    if (this.holdTimeout !== null) globalThis.clearTimeout(this.holdTimeout);
    if (this.finishTimeout !== null) globalThis.clearTimeout(this.finishTimeout);
    this.holdTimeout = null;
    this.finishTimeout = null;
    this.finishIntro();
  }
}
