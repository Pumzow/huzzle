export type PlayerProgress = {
  currentLevel: number;
  points: number;
  totalPoints: number;
  isCheater: boolean;
};

export type LevelCompletion = PlayerProgress & {
  pointsAwarded: number;
};
