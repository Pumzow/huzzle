import { GridSize, TileShape } from "../types/gameTypes";

export const gameConfig = {
  grid: {
    defaultSize: 4 as GridSize,
    sizes: [4, 6, 8] as readonly GridSize[],
  },
  pieces: {
    defaultShape: "square" as TileShape,
    shapes: [
      { value: "square", label: "Square" },
      { value: "hexagon", label: "Hexagon" },
      { value: "verticalHexagon", label: "Vertical hex" },
      { value: "octagon", label: "Octagon" },
    ] as const satisfies ReadonlyArray<{ value: TileShape; label: string }>,
    gap: 0,
    textureSize: 256,
    outlineWidth: 3,
  },
  board: {
    margin: 12,
    moveDurationMs: 170,
  },
  scoring: {
    startingStars: 3,
    baseTimeSeconds: 20,
    secondsPerStartingSet: 7,
    moveAllowanceMultiplier: .5,
    minimumFreeMoves: 4,
  },
} as const;
