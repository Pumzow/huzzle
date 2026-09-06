import { toMilliseconds } from "../../utils/time";

export class PuzzleTimer {
  private startedAt: number | null = null;
  private intervalId: number | null = null;
  private _elapsed = 0;
  private _started = false;

  constructor(private readonly onChange: () => void) {}

  get elapsed(): number {
    return this._elapsed;
  }

  get started(): boolean {
    return this._started;
  }

  restore(elapsed: number, started: boolean): void {
    this.stopInterval();
    this._elapsed = elapsed;
    this._started = started;
    this.startedAt = started ? Date.now() - elapsed * 1000 : null;
  }

  start(): void {
    if (this._started) return;
    this._started = true;
    this.startedAt = Date.now();
    this.onChange();
    this.update();
    this.startInterval();
  }

  resume(): void {
    if (this._started && this.intervalId === null) this.startInterval();
  }

  stop(): void {
    this.stopInterval();
  }

  reset(): void {
    this.stopInterval();
    this.startedAt = null;
    this._elapsed = 0;
    this._started = false;
  }

  destroy(): void {
    this.stopInterval();
  }

  private startInterval(): void {
    this.intervalId = window.setInterval(
      () => this.update(),
      toMilliseconds(0.25),
    );
  }

  private update(): void {
    if (this.startedAt === null) return;
    const elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
    if (elapsed === this._elapsed) return;
    this._elapsed = elapsed;
    this.onChange();
  }

  private stopInterval(): void {
    if (this.intervalId !== null) window.clearInterval(this.intervalId);
    this.intervalId = null;
  }
}
