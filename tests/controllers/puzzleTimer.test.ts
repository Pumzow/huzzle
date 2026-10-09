import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { PuzzleTimer } from "../../app/controllers/puzzle/puzzleTimer";

describe("PuzzleTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
  });

  afterEach(() => jest.useRealTimers());

  test("excludes paused time from the elapsed play time", () => {
    const timer = new PuzzleTimer();

    timer.start();
    jest.advanceTimersByTime(2_400);
    timer.pause();
    expect(timer.elapsed).toBe(2);

    jest.advanceTimersByTime(10_000);
    timer.resume();
    jest.advanceTimersByTime(1_100);

    expect(timer.elapsed).toBe(3);
  });

  test("does not start when an ad pauses and resumes an untouched puzzle", () => {
    const timer = new PuzzleTimer();

    timer.pause();
    jest.advanceTimersByTime(5_000);
    timer.resume();

    expect(timer.started).toBe(false);
    expect(timer.elapsed).toBe(0);
  });

  test("does not alter a timer that was already stopped at completion", () => {
    const timer = new PuzzleTimer();

    timer.start();
    jest.advanceTimersByTime(1_100);
    timer.stop();
    jest.advanceTimersByTime(5_000);
    timer.pause();
    timer.resume();
    jest.advanceTimersByTime(1_000);

    expect(timer.elapsed).toBe(1);
  });

  test("emits local change events while the elapsed time advances", () => {
    const timer = new PuzzleTimer();
    let changes = 0;
    timer.addEventListener("change", () => { changes += 1; });

    timer.start();
    jest.advanceTimersByTime(1_000);

    expect(changes).toBe(2);
  });
});
