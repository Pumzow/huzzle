export function shouldAnimateThemeTransition(
  reducedMotion: boolean,
  coarsePointer: boolean,
  maximumTouchPoints: number,
): boolean {
  return !reducedMotion && !coarsePointer && maximumTouchPoints === 0;
}
