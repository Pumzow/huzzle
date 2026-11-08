import type { LevelMode } from "../types/levelModeTypes";

export function modeFromSwipe(
  current: LevelMode,
  deltaX: number,
  deltaY: number,
  threshold: number,
  horizontalIntentRatio: number,
): LevelMode | null {
  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);
  if (horizontalDistance < Math.max(0, threshold)) return null;
  if (horizontalDistance <= verticalDistance * horizontalIntentRatio)
    return null;
  const next = deltaX < 0 ? "challenge" : "casual";
  return next === current ? null : next;
}
