import { canUseTargetSlot } from "../../systems/puzzleLogic";
import type { GridSize } from "../../types/gameTypes";
import type { PuzzleBoardGeometry } from "./puzzleBoardGeometry";
import type { PuzzleTile } from "./puzzleBoardTypes";

export type PuzzleRelocationPlan = {
  targetSlots: number[];
  displacedAssignments: Array<{ tile: PuzzleTile; slot: number }>;
};

export function findClosestSlot(
  center: { x: number; y: number },
  slotCount: number,
  geometry: PuzzleBoardGeometry,
): number {
  let closestSlot = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let slot = 0; slot < slotCount; slot += 1) {
    const position = geometry.slotPosition(slot);
    const dx = center.x - position.x - geometry.tileWidth / 2;
    const dy = center.y - position.y - geometry.tileHeight / 2;
    const distance = dx * dx + dy * dy;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestSlot = slot;
    }
  }
  return closestSlot;
}

export function planGroupRelocation(
  anchor: PuzzleTile,
  members: PuzzleTile[],
  requestedSlot: number,
  lockedTiles: Set<PuzzleTile>,
  occupancy: Array<PuzzleTile | undefined>,
  gridSize: GridSize,
  geometry: PuzzleBoardGeometry,
): PuzzleRelocationPlan | null {
  const memberSet = new Set(members);
  const anchorCoordinate = geometry.slotCoordinate(anchor.slot);
  const memberCoordinates = members.map((tile) =>
    geometry.slotCoordinate(tile.slot),
  );
  const candidateAnchorSlots = Array.from(
    { length: gridSize * gridSize },
    (_, slot) => slot,
  )
    .filter((candidateSlot) => {
      const candidate = geometry.slotCoordinate(candidateSlot);
      const delta = {
        q: candidate.q - anchorCoordinate.q,
        r: candidate.r - anchorCoordinate.r,
      };
      return memberCoordinates.every((coordinate) => {
        const targetSlot = geometry.coordinateToSlot({
          q: coordinate.q + delta.q,
          r: coordinate.r + delta.r,
        });
        return (
          targetSlot !== undefined &&
          canUseTargetSlot(occupancy[targetSlot], memberSet, lockedTiles)
        );
      });
    })
    .sort(
      (a, b) =>
        slotDistance(a, requestedSlot, geometry) -
        slotDistance(b, requestedSlot, geometry),
    );
  const targetAnchorCoordinate = geometry.slotCoordinate(
    candidateAnchorSlots[0] ?? anchor.slot,
  );
  const delta = {
    q: targetAnchorCoordinate.q - anchorCoordinate.q,
    r: targetAnchorCoordinate.r - anchorCoordinate.r,
  };
  if (delta.q === 0 && delta.r === 0) return null;

  const targetSlots = memberCoordinates.map(
    (coordinate) =>
      geometry.coordinateToSlot({
        q: coordinate.q + delta.q,
        r: coordinate.r + delta.r,
      })!,
  );
  const originSlots = members.map((tile) => tile.slot);
  const originSet = new Set(originSlots);
  const targetSet = new Set(targetSlots);
  const incomingSlots = targetSlots.filter((slot) => !originSet.has(slot));
  const vacatedSlots = originSlots.filter((slot) => !targetSet.has(slot));
  const displaced = incomingSlots
    .map((slot) => occupancy[slot]!)
    .filter((tile) => !memberSet.has(tile));
  const remainingVacancies = [...vacatedSlots];
  const displacedAssignments = displaced.map((tile) => {
    let bestIndex = 0;
    for (let index = 1; index < remainingVacancies.length; index += 1) {
      if (
        slotDistance(tile.slot, remainingVacancies[index], geometry) <
        slotDistance(tile.slot, remainingVacancies[bestIndex], geometry)
      )
        bestIndex = index;
    }
    return { tile, slot: remainingVacancies.splice(bestIndex, 1)[0] };
  });

  return { targetSlots, displacedAssignments };
}

function slotDistance(
  a: number,
  b: number,
  geometry: PuzzleBoardGeometry,
): number {
  return geometry.coordinateDistance(
    geometry.slotCoordinate(a),
    geometry.slotCoordinate(b),
  );
}
