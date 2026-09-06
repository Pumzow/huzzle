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

function tile(slot: number, group = slot, gridSize = 4): PuzzleTile {
  return {
    slot,
    group,
    row: Math.floor(slot / gridSize),
    col: slot % gridSize,
  } as PuzzleTile;
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

  test("splits a destination group when only part of it is swapped", () => {
    const largeGeometry = createPuzzleBoardGeometry({
      width: 900,
      height: 900,
      gridSize: 6,
      tileShape: "square",
      cardAspectRatio: 3 / 4,
    });
    const occupancy = Array.from({ length: 36 }, (_, slot) =>
      tile(slot, slot, 6),
    );
    const moving = [occupancy[0], occupancy[1]];
    moving.forEach((member) => {
      member.group = 100;
    });
    const destination = [occupancy[9], occupancy[10], occupancy[11]];
    destination.forEach((member) => {
      member.group = 200;
    });

    const plan = planGroupRelocation(
      moving[0],
      moving,
      9,
      new Set(),
      occupancy,
      6,
      largeGeometry,
    );

    expect(plan?.targetSlots).toEqual([9, 10]);
    expect(
      plan?.displacedAssignments
        .filter(({ tile }) => destination.includes(tile))
        .map(({ slot }) => slot),
    ).toEqual([0, 1]);
    expect(
      plan?.displacedAssignments.some(({ tile }) => tile === destination[2]),
    ).toBe(false);
    expect(plan?.displacedMoveGroups[0]).toEqual(destination.slice(0, 2));
  });

  test("preserves a smaller destination group when it is fully swapped", () => {
    const largeGeometry = createPuzzleBoardGeometry({
      width: 900,
      height: 900,
      gridSize: 6,
      tileShape: "square",
      cardAspectRatio: 3 / 4,
    });
    const occupancy = Array.from({ length: 36 }, (_, slot) =>
      tile(slot, slot, 6),
    );
    const moving = [occupancy[0], occupancy[1], occupancy[2]];
    moving.forEach((member) => {
      member.group = 100;
    });
    const destination = [occupancy[9], occupancy[10]];
    destination.forEach((member) => {
      member.group = 200;
    });

    const plan = planGroupRelocation(
      moving[0],
      moving,
      9,
      new Set(),
      occupancy,
      6,
      largeGeometry,
    );

    expect(plan?.targetSlots).toEqual([9, 10, 11]);
    expect(
      plan?.displacedAssignments
        .filter(({ tile }) => destination.includes(tile))
        .map(({ slot }) => slot),
    ).toEqual([0, 1]);
    expect(plan?.displacedMoveGroups[0]).toEqual(destination);
  });

  test("preserves a 2 by 3 destination group during an equal group swap", () => {
    const largeGeometry = createPuzzleBoardGeometry({
      width: 900,
      height: 900,
      gridSize: 6,
      tileShape: "square",
      cardAspectRatio: 3 / 4,
    });
    const occupancy = Array.from({ length: 36 }, (_, slot) =>
      tile(slot, slot, 6),
    );
    const movingSlots = [0, 1, 6, 7, 12, 13];
    const destinationSlots = [3, 4, 9, 10, 15, 16];
    const moving = movingSlots.map((slot) => occupancy[slot]);
    const destination = destinationSlots.map((slot) => occupancy[slot]);
    moving.forEach((member) => {
      member.group = 100;
    });
    destination.forEach((member) => {
      member.group = 200;
    });

    const plan = planGroupRelocation(
      moving[0],
      moving,
      3,
      new Set(),
      occupancy,
      6,
      largeGeometry,
    );

    expect(plan?.targetSlots).toEqual(destinationSlots);
    expect(
      plan?.displacedAssignments
        .filter(({ tile }) => destination.includes(tile))
        .map(({ slot }) => slot),
    ).toEqual(movingSlots);
    expect(plan?.displacedMoveGroups[0]).toEqual(destination);
  });
});
