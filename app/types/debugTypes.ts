import type { GridSize, TileShapeTypes } from "./gameTypes";
import type { PlayerProgress } from "./progressTypes";

export type DebugPuzzleState = {
  gridSize: GridSize;
  tileShape: TileShapeTypes;
  moves: number;
  stars: number;
  maximumStars: number;
  timeRemaining: number;
};

export type DebugPuzzleScenario = Omit<DebugPuzzleState, "maximumStars"> & {
  groups: number[][];
};

export type DebugPuzzleRuntimeState = Pick<
  DebugPuzzleState,
  "moves" | "stars" | "timeRemaining"
>;

export interface DebugSceneTarget {
  getDebugPuzzleState?(): DebugPuzzleState;
  subscribeDebugPuzzleState?(
    listener: (state: DebugPuzzleState) => void,
  ): () => void;
  applyDebugPuzzleRuntime?(state: Partial<DebugPuzzleRuntimeState>): void;
  applyDebugPuzzleScenario?(scenario: DebugPuzzleScenario): void;
  completeDebugPuzzle?(): void;
  restartDebugPuzzle?(): void;
  onDebugProgressChanged?(progress: PlayerProgress): void;
}
