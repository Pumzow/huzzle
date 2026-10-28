import { canUseTargetSlot } from "../../systems/puzzleLogic";
import type { GridSize } from "../../types/gameTypes";
import type { PuzzleBoardGeometry } from "./puzzleBoardGeometry";
import type { PuzzleTile } from "./puzzleBoardTypes";

export type PuzzleRelocationPlan = {
  targetSlots: number[];
  displacedAssignments: Array<{ tile: PuzzleTile; slot: number }>;
  displacedMoveGroups: PuzzleTile[][];
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
  const remainingVacancies = new Set(vacatedSlots);
  const preservedGroups: PuzzleTile[][] = [];
  const displacedAssignments: Array<{ tile: PuzzleTile; slot: number }> = [];
  const preservedTiles = new Set<PuzzleTile>();
  const touchedGroupIds = new Set(displaced.map((tile) => tile.group));

  touchedGroupIds.forEach((groupId) => {
    const group = displaced.filter((tile) => tile.group === groupId);
    if (group.length === 0) return;

    const assignments = findRigidGroupPlacement(
      group,
      remainingVacancies,
      geometry,
      { q: -delta.q, r: -delta.r },
    );
    if (!assignments) return;

    preservedGroups.push(group);
    assignments.forEach(({ tile, slot }) => {
      preservedTiles.add(tile);
      remainingVacancies.delete(slot);
      displacedAssignments.push({ tile, slot });
    });
  });

  const individuallyDisplaced = displaced.filter(
    (tile) => !preservedTiles.has(tile),
  );
  individuallyDisplaced.forEach((tile) => {
    const vacancies = [...remainingVacancies];
    let bestIndex = 0;
    for (let index = 1; index < vacancies.length; index += 1) {
      if (
        slotDistance(tile.slot, vacancies[index], geometry) <
        slotDistance(tile.slot, vacancies[bestIndex], geometry)
      )
        bestIndex = index;
    }
    const slot = vacancies[bestIndex];
    remainingVacancies.delete(slot);
    displacedAssignments.push({ tile, slot });
  });

  return {
    targetSlots,
    displacedAssignments,
    displacedMoveGroups: [
      ...preservedGroups,
      ...individuallyDisplaced.map((tile) => [tile]),
    ],
  };
}

function findRigidGroupPlacement(
  group: PuzzleTile[],
  vacancies: Set<number>,
  geometry: PuzzleBoardGeometry,
  preferredDelta: { q: number; r: number },
): Array<{ tile: PuzzleTile; slot: number }> | null {
  const origin = geometry.slotCoordinate(group[0].slot);
  const candidateDeltas = [
    preferredDelta,
    ...[...vacancies].map((slot) => {
      const target = geometry.slotCoordinate(slot);
      return { q: target.q - origin.q, r: target.r - origin.r };
    }),
  ];
  const uniqueDeltas = new Map(
    candidateDeltas.map((delta) => [`${delta.q}:${delta.r}`, delta]),
  );

  const placements = [...uniqueDeltas.values()]
    .map((delta) => {
      const assignments = group.map((tile) => {
        const coordinate = geometry.slotCoordinate(tile.slot);
        return {
          tile,
          slot: geometry.coordinateToSlot({
            q: coordinate.q + delta.q,
            r: coordinate.r + delta.r,
          }),
        };
      });
      const slots = assignments.map(({ slot }) => slot);
      if (
        slots.some((slot) => slot === undefined || !vacancies.has(slot)) ||
        new Set(slots).size !== slots.length
      )
        return null;
      return {
        assignments: assignments as Array<{ tile: PuzzleTile; slot: number }>,
        preferred:
          delta.q === preferredDelta.q && delta.r === preferredDelta.r,
        distance: assignments.reduce(
          (total, { tile, slot }) =>
            total + slotDistance(tile.slot, slot!, geometry),
          0,
        ),
      };
    })
    .filter((placement) => placement !== null)
    .sort(
      (a, b) =>
        Number(b.preferred) - Number(a.preferred) || a.distance - b.distance,
    );

  return placements[0]?.assignments ?? null;
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
