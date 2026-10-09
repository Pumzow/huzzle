import { toMilliseconds } from "../../utils/time";

type TimerInterval = ReturnType<typeof globalThis.setInterval>;

export class PuzzleTimerClock {
  now(): number {
    return Date.now();
  }

  setInterval(callback: () => void, delay: number): TimerInterval {
    return globalThis.setInterval(callback, delay);
  }

  clearInterval(intervalId: TimerInterval): void {
    globalThis.clearInterval(intervalId);
  }
}

export class PuzzleTimer extends EventTarget {
  private readonly clock = new PuzzleTimerClock();
  private startedAt: number | null = null;
  private pausedAt: number | null = null;
  private intervalId: TimerInterval | null = null;
  private _elapsed = 0;
  private _started = false;
  private stopped = false;

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
    this.startedAt = started ? this.clock.now() - elapsed * 1000 : null;
    this.pausedAt = started ? this.clock.now() : null;
    this.stopped = false;
  }

  start(): void {
    if (this._started) return;
    this._started = true;
    this.startedAt = this.clock.now();
    this.pausedAt = null;
    this.stopped = false;
    this.notifyChange();
    this.update();
    this.startInterval();
  }

  pause(): void {
    if (!this._started || this.pausedAt !== null || this.intervalId === null)
      return;
    this.update();
    this.pausedAt = this.clock.now();
    this.stopInterval();
  }

  resume(): void {
    if (!this._started || this.stopped || this.intervalId !== null) return;
    if (this.pausedAt !== null && this.startedAt !== null) {
      this.startedAt += this.clock.now() - this.pausedAt;
      this.pausedAt = null;
    }
    this.startInterval();
  }

  stop(): void {
    if (this.intervalId !== null) this.update();
    this.stopInterval();
    this.pausedAt = null;
    this.stopped = true;
  }

  reset(): void {
    this.stopInterval();
    this.startedAt = null;
    this.pausedAt = null;
    this._elapsed = 0;
    this._started = false;
    this.stopped = false;
  }

  destroy(): void {
    this.stopInterval();
  }

  private startInterval(): void {
    this.intervalId = this.clock.setInterval(
      () => this.update(),
      toMilliseconds(0.25),
    );
  }

  private update(): void {
    if (this.startedAt === null) return;
    const elapsed = Math.floor((this.clock.now() - this.startedAt) / 1000);
    if (elapsed === this._elapsed) return;
    this._elapsed = elapsed;
    this.notifyChange();
  }

  private notifyChange(): void {
    this.dispatchEvent(new Event("change"));
  }

  private stopInterval(): void {
    if (this.intervalId !== null) this.clock.clearInterval(this.intervalId);
    this.intervalId = null;
  }
}
