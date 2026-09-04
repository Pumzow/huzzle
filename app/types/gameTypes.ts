import type { HuzzleGridSize, HuzzleTileShape } from "drygon-huzzle-rules";

export type GridSize = HuzzleGridSize;
export type TileShapeTypes = HuzzleTileShape;
export type TileShape = {
  value: TileShapeTypes;
  weight?: number;
};
export type PuzzleScoringConfig = {
  startingStars: number;
  pointsPerStar: number;
  gridSizeMultipliers: Record<GridSize, number>;
  tileShapeMultipliers: Record<TileShapeTypes, number>;
  baseTime: number;
  secondsPerStartingSet: number;
  moveAllowanceMultiplier: number;
  minimumFreeMoves: number;
};
export type Theme = "light" | "dark";

export type PuzzleProgress = {
  slots: number[];
  moves: number;
  groups: number;
  won: boolean;
  startingGroups: number;
  moveLimit: number;
};

export type PuzzleBoardState = Pick<
  PuzzleProgress,
  "slots" | "moves" | "groups" | "startingGroups" | "moveLimit"
> & {
  started: boolean;
};

export type PuzzleBoardOptions = {
  imageUrl: string;
  gridSize: GridSize;
  tileShape: TileShapeTypes;
  scoring: PuzzleScoringConfig;
  initialState?: PuzzleBoardState;
  random?: () => number;
  onProgress: (progress: PuzzleProgress) => void;
  onStart: () => void;
  onReady?: () => void;
};
