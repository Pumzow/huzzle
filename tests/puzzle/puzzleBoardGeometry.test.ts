import { describe, expect, test } from "bun:test";
import { createPuzzleBoardGeometry } from "../../app/gameplay/puzzle/puzzleBoardGeometry";
import type { TileShapeTypes } from "../../app/types/gameTypes";

const boardOptions = {
  width: 900,
  height: 700,
  gridSize: 4 as const,
  cardAspectRatio: 3 / 4,
};

describe("puzzle board geometry", () => {
  test.each([
    "square",
    "card",
    "hexagon",
    "verticalHexagon",
    "octagon",
  ] satisfies TileShapeTypes[])(
    "maps every %s coordinate back to its slot",
    (tileShape) => {
      const geometry = createPuzzleBoardGeometry({
        ...boardOptions,
        tileShape,
      });

      for (let slot = 0; slot < boardOptions.gridSize ** 2; slot += 1) {
        expect(geometry.coordinateToSlot(geometry.slotCoordinate(slot))).toBe(
          slot,
        );
      }
    },
  );

  test("keeps card tiles and their board portrait", () => {
    const geometry = createPuzzleBoardGeometry({
      ...boardOptions,
      tileShape: "card",
    });

    expect(geometry.tileHeight).toBeGreaterThan(geometry.tileWidth);
    expect(geometry.gridHeight).toBeGreaterThan(geometry.gridWidth);
  });

  test("keeps square tiles and their board square", () => {
    const geometry = createPuzzleBoardGeometry({
      ...boardOptions,
      tileShape: "square",
    });

    expect(geometry.tileHeight).toBe(geometry.tileWidth);
    expect(geometry.gridHeight).toBe(geometry.gridWidth);
  });
});
