export type GridSize = 4 | 6 | 8;
export type TileShapeTypes = "square" | "card" | "hexagon" | "verticalHexagon" | "octagon";
export type TileShape = {
  value: TileShapeTypes;
  weight?: number;
};
export type PuzzleScoringConfig = {
  startingStars: number;
  pointsPerStar: number;
  gridSizeMultipliers: Record<GridSize, number>;
  tileShapeMultipliers: Record<TileShapeTypes, number>;
  baseTimeSeconds: number;
  secondsPerStartingSet: number;
  moveAllowanceMultiplier: number;
  minimumFreeMoves: number;
};
export type Theme = "light" | "dark";

export type PuzzleProgress = {
  moves: number;
  groups: number;
  won: boolean;
  startingGroups: number;
  moveLimit: number;
};

export type PuzzleBoardOptions = {
  imageUrl: string;
  gridSize: GridSize;
  tileShape: TileShapeTypes;
  scoring: PuzzleScoringConfig;
  random?: () => number;
  onProgress: (progress: PuzzleProgress) => void;
  onStart: () => void;
  onReady?: () => void;
};
