import { describe, expect, test } from "bun:test";
import { createPuzzleBoardGeometry } from "../../app/gameplay/puzzle/puzzleBoardGeometry";
import {
  findClosestSlot,
  planGroupRelocation,
} from "../../app/gameplay/puzzle/puzzlePlacement";
import type { PuzzleTile } from "../../app/gameplay/puzzle/puzzleBoardTypes";

const geometry = createPuzzleBoardGeometry({
  width: 800,
  height: 800,
  gridSize: 4,
  tileShape: "square",
  cardAspectRatio: 3 / 4,
});

function tile(slot: number): PuzzleTile {
  return { slot, row: Math.floor(slot / 4), col: slot % 4 } as PuzzleTile;
}

describe("puzzle placement", () => {
  test("finds the slot under a tile center", () => {
    const position = geometry.slotPosition(6);
    expect(
      findClosestSlot(
        {
          x: position.x + geometry.tileWidth / 2,
          y: position.y + geometry.tileHeight / 2,
        },
        16,
        geometry,
      ),
    ).toBe(6);
  });

  test("plans a single-tile swap without mutating occupancy", () => {
    const occupancy = Array.from({ length: 16 }, (_, slot) => tile(slot));
    const moving = occupancy[0];
    const displaced = occupancy[5];
    const plan = planGroupRelocation(
      moving,
      [moving],
      5,
      new Set(),
      occupancy,
      4,
      geometry,
    );

    expect(plan?.targetSlots).toEqual([5]);
    expect(plan?.displacedAssignments).toEqual([{ tile: displaced, slot: 0 }]);
    expect(occupancy.map(({ slot }) => slot)).toEqual(
      Array.from({ length: 16 }, (_, slot) => slot),
    );
  });

  test("returns no relocation when released in the original slot", () => {
    const occupancy = Array.from({ length: 16 }, (_, slot) => tile(slot));
    expect(
      planGroupRelocation(
        occupancy[3],
        [occupancy[3]],
        3,
        new Set(),
        occupancy,
        4,
        geometry,
      ),
    ).toBeNull();
  });
});
