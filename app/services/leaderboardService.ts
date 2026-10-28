import { platformApi, PlatformApiError } from "./platformApi";
import type {
  HuzzleLeaderboardEntry,
  HuzzleLeaderboardPeriod,
} from "../types/platformTypes";
import {
  platformSession,
} from "./platformSession";
import type { PlatformSessionState } from "../types/platformTypes";

export type LeaderboardResult = {
  entries: HuzzleLeaderboardEntry[];
  currentPlayerId: string | null;
};

export class LeaderboardService {
  get isAuthenticated(): boolean {
    return platformSession.authenticationToken !== null;
  }

  subscribe(listener: (state: PlatformSessionState) => void): () => void {
    return platformSession.subscribe(listener);
  }

  async load(period: HuzzleLeaderboardPeriod): Promise<LeaderboardResult> {
    const token = platformSession.authenticationToken;
    if (!token) return { entries: [], currentPlayerId: null };
    return {
      entries: await platformApi.getHuzzleLeaderboard(token, period),
      currentPlayerId: platformSession.state.user?.id ?? null,
    };
  }

  errorMessage(error: unknown): string {
    return error instanceof PlatformApiError
      ? error.message
      : "Could not load the leaderboard.";
  }
}

export const leaderboardService = new LeaderboardService();
