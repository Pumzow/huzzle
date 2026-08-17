export type GridSize = 4 | 6 | 8;
export type TileShape = "square" | "hexagon" | "octagon";
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
  tileShape: TileShape;
  onProgress: (progress: PuzzleProgress) => void;
  onStart: () => void;
};
