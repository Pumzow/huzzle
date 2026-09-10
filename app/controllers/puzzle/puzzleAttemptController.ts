import {
  levelAttemptStore,
  type LevelAttemptSnapshot,
} from "../../services/levelAttemptStore";
import type {
  GridSize,
  PuzzleProgress,
  TileShapeTypes,
} from "../../types/gameTypes";

export type RestoredPuzzleAttempt = {
  snapshot: LevelAttemptSnapshot;
  progress: PuzzleProgress;
  elapsed: number;
  started: boolean;
  hintUsed: boolean;
};

export class PuzzleAttemptController {
  restore(
    levelId: number,
    gridSize: GridSize,
    tileShape: TileShapeTypes,
  ): RestoredPuzzleAttempt | null {
    const snapshot = levelAttemptStore.load(levelId, gridSize, tileShape);
    if (!snapshot) return null;
    return {
      snapshot,
      progress: {
        slots: [...snapshot.slots],
        moves: snapshot.moves,
        groups: snapshot.groups,
        won: false,
        startingGroups: snapshot.startingGroups,
        moveLimit: snapshot.moveLimit,
      },
      elapsed: snapshot.elapsedSeconds,
      started: snapshot.started,
      hintUsed: snapshot.hintUsed,
    };
  }

  save(options: {
    levelId: number | null;
    attemptId?: number | null;
    gridSize: GridSize;
    tileShape: TileShapeTypes;
    progress: PuzzleProgress;
    started: boolean;
    elapsed: number;
    hintUsed: boolean;
  }): void {
    const { levelId, attemptId = levelId, gridSize, tileShape, progress, started, elapsed, hintUsed } =
      options;
    if (attemptId === null || progress.won || progress.slots.length === 0) return;
    levelAttemptStore.save({
      version: 1,
      levelId: attemptId,
      gridSize,
      tileShape,
      slots: [...progress.slots],
      moves: progress.moves,
      groups: progress.groups,
      startingGroups: progress.startingGroups,
      moveLimit: progress.moveLimit,
      started,
      elapsedSeconds: elapsed,
      hintUsed,
    });
  }

  clear(): void {
    levelAttemptStore.clear();
  }
}
