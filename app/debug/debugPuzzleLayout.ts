type DebugGridCoordinate = { q: number; r: number };

type DebugPuzzleLayoutOptions = {
  slotCount: number;
  coordinateForSlot(slot: number): DebugGridCoordinate;
  slotForCoordinate(coordinate: DebugGridCoordinate): number | undefined;
  random?: () => number;
};

type GroupPlacement = {
  sourceSlots: number[];
  targetSlots: number[];
};

export function buildDebugPuzzleLayout(
  paintedGroups: readonly number[][],
  options: DebugPuzzleLayoutOptions,
): number[] {
  const { slotCount, coordinateForSlot, slotForCoordinate } = options;
  const random = options.random ?? Math.random;
  const claimedSources = new Set<number>();
  const normalizedGroups = paintedGroups
    .map((group) =>
      group.filter((slot) => {
        if (
          !Number.isInteger(slot) ||
          slot < 0 ||
          slot >= slotCount ||
          claimedSources.has(slot)
        )
          return false;
        claimedSources.add(slot);
        return true;
      }),
    );
  const groups = normalizedGroups
    .filter((group) => group.length > 1)
    .sort((a, b) => b.length - a.length);
  const groupedSources = new Set(groups.flat());
  const singles = Array.from({ length: slotCount }, (_, slot) => slot).filter(
    (slot) => !groupedSources.has(slot),
  );
  const placements = groups.map((group) =>
    shuffled(
      validPlacements(group, slotCount, coordinateForSlot, slotForCoordinate),
      random,
    ),
  );
  const occupied = new Set<number>();
  const selected: GroupPlacement[] = [];
  let attempts = 0;

  const placeGroup = (index: number): boolean => {
    if (attempts > 100_000) return false;
    if (index === groups.length) return true;
    for (const placement of placements[index]) {
      attempts += 1;
      if (placement.targetSlots.some((slot) => occupied.has(slot))) continue;
      placement.targetSlots.forEach((slot) => occupied.add(slot));
      selected.push(placement);
      if (placeGroup(index + 1)) return true;
      selected.pop();
      placement.targetSlots.forEach((slot) => occupied.delete(slot));
    }
    return false;
  };

  if (!placeGroup(0)) return Array.from({ length: slotCount }, (_, slot) => slot);

  const layout = Array.from({ length: slotCount }, (_, slot) => slot);
  selected.forEach(({ sourceSlots, targetSlots }) => {
    sourceSlots.forEach((source, index) => {
      layout[source] = targetSlots[index];
    });
  });
  const vacancies = shuffled(
    Array.from({ length: slotCount }, (_, slot) => slot).filter(
      (slot) => !occupied.has(slot),
    ),
    random,
  );
  singles.forEach((source, index) => {
    layout[source] = vacancies[index];
  });
  return layout;
}

function validPlacements(
  sourceSlots: number[],
  slotCount: number,
  coordinateForSlot: (slot: number) => DebugGridCoordinate,
  slotForCoordinate: (coordinate: DebugGridCoordinate) => number | undefined,
): GroupPlacement[] {
  const sourceAnchor = coordinateForSlot(sourceSlots[0]);
  const sourceCoordinates = sourceSlots.map(coordinateForSlot);
  return Array.from({ length: slotCount }, (_, targetSlot) => targetSlot)
    .map((targetSlot) => {
      const targetAnchor = coordinateForSlot(targetSlot);
      const delta = {
        q: targetAnchor.q - sourceAnchor.q,
        r: targetAnchor.r - sourceAnchor.r,
      };
      const targetSlots = sourceCoordinates.map((coordinate) =>
        slotForCoordinate({
          q: coordinate.q + delta.q,
          r: coordinate.r + delta.r,
        }),
      );
      if (
        targetSlots.some((slot) => slot === undefined) ||
        new Set(targetSlots).size !== targetSlots.length
      )
        return null;
      return {
        sourceSlots,
        targetSlots: targetSlots as number[],
      };
    })
    .filter((placement): placement is GroupPlacement => placement !== null);
}

function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
