import { GridSize, TileShapeTypes } from "../types/gameTypes";

export const gameConfig = {
  grid: {
    defaultSize: 4 as GridSize,
    sizes: [4, 6, 8] as readonly GridSize[],
  },
  pieces: {
    defaultShape: "square" as TileShapeTypes,
    shapes: [
      { value: "square", label: "Square" },
      { value: "card", label: "Card", aspectRatio: 3 / 4 },
      { value: "hexagon", label: "Hexagon" },
      { value: "verticalHexagon", label: "Vertical hex" },
      { value: "octagon", label: "Octagon" },
    ] as const satisfies ReadonlyArray<{ value: TileShapeTypes; label: string; aspectRatio?: number }>,
    gap: 0,
    textureSize: 256,
    outlineWidth: 3,
  },
  board: {
    margin: 12,
    moveDurationMs: 170,
  },
} as const;
