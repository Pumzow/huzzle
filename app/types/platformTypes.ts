export type PlatformUser = {
  id: string;
  username: string;
  avatar?: string;
};

export type PlatformSessionState = {
  status: "guest" | "restoring" | "authenticated";
  user: PlatformUser | null;
  profileId: string | null;
};

export type GameEntry = {
  game: {
    id: string;
    slug: string;
    name: string;
  };
  profile: {
    id: string;
    playerId: string;
    gameId: string;
    lastPlayedAt: string;
  };
};

export type HuzzleProgress = {
  currentLevel: number;
  points: number;
  totalPoints?: number;
  isCheater?: boolean;
  weekStart?: string;
};

export type HuzzleCompletion = HuzzleProgress & {
  pointsAwarded: number;
};

export type HuzzleLeaderboardEntry = {
  rank: number;
  playerId: string;
  username: string;
  avatar: string;
  points: number;
  isCheater: boolean;
};

export type HuzzleLeaderboardPeriod = "weekly" | "all-time";
