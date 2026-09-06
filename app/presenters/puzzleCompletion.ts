export function completionMessage(earnedStars: number): string {
  return earnedStars === 3
    ? "Excellent!"
    : earnedStars === 2
      ? "Well done!"
      : "Puzzle completed!";
}

export function completionPointsMessage(
  pointsAwarded: number,
  isCheater: boolean,
): string {
  if (isCheater) return "No points for cheaters";
  return pointsAwarded > 0 ? `+${pointsAwarded} points` : "";
}
