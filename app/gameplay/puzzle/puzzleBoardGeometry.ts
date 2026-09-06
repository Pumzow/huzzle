import { gameConfig } from "../../config/gameConfig";
import type { GridSize, TileShapeTypes } from "../../types/gameTypes";
import type { GridCoordinate } from "./puzzleBoardTypes";

type GeometryOptions = {
  width: number;
  height: number;
  gridSize: GridSize;
  tileShape: TileShapeTypes;
  cardAspectRatio: number;
};

export function createPuzzleBoardGeometry({
  width,
  height,
  gridSize,
  tileShape,
  cardAspectRatio,
}: GeometryOptions) {
  const isCard = tileShape === "card";
  const isFlatHexagon = tileShape === "hexagon";
  const isVerticalHexagon = tileShape === "verticalHexagon";
  const isHexagon = isFlatHexagon || isVerticalHexagon;
  const isRectangle = tileShape === "square" || isCard;
  const availableWidth = Math.max(180, width - gameConfig.board.margin * 2);
  const availableHeight = Math.max(180, height - gameConfig.board.margin * 2);
  const flatHexWidthFactor = 0.75 * gridSize + 0.25;
  const flatHexHeightFactor = (Math.sqrt(3) / 2) * (gridSize + 0.5);
  const verticalHexWidthFactor = (Math.sqrt(3) / 2) * (gridSize + 0.5);
  const verticalHexHeightFactor = 0.75 * gridSize + 0.25;
  const flatHexTileWidth = Math.max(
    24,
    Math.min(
      availableWidth / flatHexWidthFactor,
      availableHeight / flatHexHeightFactor,
    ),
  );
  const verticalHexTileHeight = Math.max(
    24,
    Math.min(
      availableWidth / verticalHexWidthFactor,
      availableHeight / verticalHexHeightFactor,
    ),
  );
  const cardTileWidth = Math.max(
    18,
    Math.floor(
      Math.min(
        availableWidth / gridSize,
        (availableHeight * cardAspectRatio) / gridSize,
      ),
    ),
  );
  const tileWidth = isCard
    ? cardTileWidth
    : isFlatHexagon
      ? flatHexTileWidth
      : isVerticalHexagon
        ? Math.round((verticalHexTileHeight * Math.sqrt(3)) / 2)
        : Math.floor(Math.min(availableWidth, availableHeight) / gridSize);
  const tileHeight = isCard
    ? Math.round(tileWidth / cardAspectRatio)
    : isFlatHexagon
      ? Math.round((tileWidth * Math.sqrt(3)) / 2)
      : isVerticalHexagon
        ? verticalHexTileHeight
        : tileWidth;
  const horizontalStep = isFlatHexagon ? tileWidth * 0.75 : tileWidth;
  const verticalStep = isVerticalHexagon ? tileHeight * 0.75 : tileHeight;
  const gridWidth = isCard
    ? tileWidth * gridSize
    : isFlatHexagon
      ? tileWidth + horizontalStep * (gridSize - 1)
      : isVerticalHexagon
        ? tileWidth * (gridSize + 0.5)
        : tileWidth * gridSize;
  const gridHeight = isCard
    ? tileHeight * gridSize
    : isFlatHexagon
      ? tileHeight * (gridSize + 0.5)
      : isVerticalHexagon
        ? tileHeight + verticalStep * (gridSize - 1)
        : tileHeight * gridSize;
  const boardWidth = gridWidth;
  const boardHeight = gridHeight;
  const boardX = Math.round((width - boardWidth) / 2);
  const boardY = Math.round((height - boardHeight) / 2);
  const startX = Math.round((width - gridWidth) / 2);
  const startY = Math.round((height - gridHeight) / 2);
  const hexImageSize = Math.max(gridWidth, gridHeight);
  const hexImageX = startX + (gridWidth - hexImageSize) / 2;
  const hexImageY = startY + (gridHeight - hexImageSize) / 2;

  const coordinateFor = (row: number, col: number): GridCoordinate =>
    isFlatHexagon
      ? { q: col, r: row - Math.floor(col / 2) }
      : isVerticalHexagon
        ? { q: col - Math.floor(row / 2), r: row }
        : { q: col, r: row };
  const slotCoordinate = (slot: number) =>
    coordinateFor(Math.floor(slot / gridSize), slot % gridSize);
  const coordinateKey = ({ q, r }: GridCoordinate) => `${q}:${r}`;
  const coordinateToSlot = ({ q, r }: GridCoordinate): number | undefined => {
    const col = q;
    const row = isFlatHexagon ? r + Math.floor(q / 2) : r;
    const resolvedCol = isVerticalHexagon ? q + Math.floor(r / 2) : col;
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(resolvedCol) ||
      row < 0 ||
      row >= gridSize ||
      resolvedCol < 0 ||
      resolvedCol >= gridSize
    )
      return undefined;
    return row * gridSize + resolvedCol;
  };
  const directions: GridCoordinate[] = isHexagon
    ? [
        { q: 0, r: -1 },
        { q: 1, r: -1 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: -1, r: 1 },
        { q: -1, r: 0 },
      ]
    : [
        { q: 0, r: -1 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: -1, r: 0 },
      ];
  const forwardDirections = isHexagon
    ? directions.slice(1, 4)
    : directions.slice(1, 3);
  const coordinateDistance = (a: GridCoordinate, b: GridCoordinate) => {
    const dq = a.q - b.q;
    const dr = a.r - b.r;
    return isHexagon
      ? (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
      : Math.abs(dq) + Math.abs(dr);
  };
  const slotPosition = (slot: number) => {
    const row = Math.floor(slot / gridSize);
    const col = slot % gridSize;
    return {
      x:
        startX +
        col * (horizontalStep + gameConfig.pieces.gap) +
        (isVerticalHexagon && row % 2 ? tileWidth / 2 : 0),
      y:
        startY +
        row * (verticalStep + gameConfig.pieces.gap) +
        (isFlatHexagon && col % 2 ? tileHeight / 2 : 0),
    };
  };

  const octagonCut = tileWidth * (1 - Math.SQRT1_2);
  const tilePoints = isFlatHexagon
    ? [
        tileWidth * 0.25, 0, tileWidth * 0.75, 0,
        tileWidth, tileHeight / 2, tileWidth * 0.75, tileHeight,
        tileWidth * 0.25, tileHeight, 0, tileHeight / 2,
      ]
    : isVerticalHexagon
      ? [
          tileWidth / 2, 0, tileWidth, tileHeight * 0.25,
          tileWidth, tileHeight * 0.75, tileWidth / 2, tileHeight,
          0, tileHeight * 0.75, 0, tileHeight * 0.25,
        ]
      : tileShape === "octagon"
        ? [
            octagonCut, 0, tileWidth - octagonCut, 0,
            tileWidth, octagonCut, tileWidth, tileHeight - octagonCut,
            tileWidth - octagonCut, tileHeight, octagonCut, tileHeight,
            0, tileHeight - octagonCut, 0, octagonCut,
          ]
        : [0, 0, tileWidth, 0, tileWidth, tileHeight, 0, tileHeight];
  const outlineDirections: Array<GridCoordinate | null> =
    tileShape === "octagon"
      ? [directions[0], null, directions[1], null, directions[2], null, directions[3], null]
      : isVerticalHexagon
        ? [...directions.slice(1), directions[0]]
        : directions;

  return {
    isHexagon,
    isRectangle,
    tileWidth,
    tileHeight,
    gridWidth,
    gridHeight,
    boardWidth,
    boardHeight,
    boardX,
    boardY,
    startX,
    startY,
    hexImageSize,
    hexImageX,
    hexImageY,
    tilePoints,
    outlineDirections,
    forwardDirections,
    coordinateFor,
    slotCoordinate,
    coordinateKey,
    coordinateToSlot,
    coordinateDistance,
    slotPosition,
  };
}

export type PuzzleBoardGeometry = ReturnType<typeof createPuzzleBoardGeometry>;
