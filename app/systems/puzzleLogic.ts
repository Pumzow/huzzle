import { GridSize } from "../types/gameTypes";

export function shuffledSlots(gridSize: GridSize, random: () => number = Math.random): number[] {
  const result = Array.from({ length: gridSize * gridSize }, (_, index) => index);
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  if (result.every((slot, index) => slot === index)) result.push(result.shift()!);
  return result;
}

export function minimumSwapsToSolve(slots: readonly number[]): number {
  const visited = Array(slots.length).fill(false);
  let swaps = 0;
  for (let start = 0; start < slots.length; start++) {
    if (visited[start] || slots[start] === start) continue;
    let cycleLength = 0;
    let current = start;
    while (!visited[current]) {
      visited[current] = true;
      current = slots[current];
      cycleLength += 1;
    }
    swaps += cycleLength - 1;
  }
  return swaps;
}

export function moveLimitFor(
  requiredMoves: number,
  minimumFreeMoves: number,
  allowanceMultiplier: number,
): number {
  return requiredMoves + Math.max(minimumFreeMoves, Math.ceil(requiredMoves * allowanceMultiplier));
}

export function canStartGroupDrag<T>(members: readonly T[], activeGroups: Iterable<readonly T[]>): boolean {
  const heldMembers = new Set([...activeGroups].flatMap((group) => [...group]));
  return members.every((member) => !heldMembers.has(member));
}

export function canUseTargetSlot<T>(occupant: T | undefined, movingMembers: ReadonlySet<T>, lockedMembers: ReadonlySet<T>): boolean {
  return !occupant || movingMembers.has(occupant) || !lockedMembers.has(occupant);
}
