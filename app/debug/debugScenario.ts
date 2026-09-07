export function debugGroupsFromCells(
  cells: readonly (number | null)[],
): number[][] {
  const groups = new Map<number, number[]>();
  cells.forEach((group, slot) => {
    if (group === null) return;
    const slots = groups.get(group) ?? [];
    slots.push(slot);
    groups.set(group, slots);
  });
  return [...groups.values()];
}
