import { levelProgressStore } from "./levelProgressStore";
import { platformApi, PlatformApiError } from "./platformApi";
import { platformSession } from "./platformSession";
import type {
  PlatformSessionState,
  PlatformUser,
} from "../types/platformTypes";

export type AccountSummary = {
  currentLevel: number;
  points: number;
  totalPoints: number;
  isCheater: boolean;
  rank: number | null;
};

export class AccountService {
  get state(): PlatformSessionState {
    return platformSession.state;
  }

  subscribe(listener: (state: PlatformSessionState) => void): () => void {
    return platformSession.subscribe(listener);
  }

  async signIn(username: string, password: string): Promise<void> {
    await platformSession.signIn(username, password);
    await levelProgressStore.syncAuthenticated().catch(() => undefined);
  }

  register(
    username: string,
    email: string,
    password: string,
  ): Promise<{ message: string }> {
    return platformSession.register(username, email, password);
  }

  signOut(): Promise<void> {
    return platformSession.signOut();
  }

  async loadSummary(user: PlatformUser): Promise<AccountSummary> {
    const token = platformSession.authenticationToken;
    const [progress, leaderboard] = await Promise.all([
      levelProgressStore.load(),
      token
        ? platformApi.getHuzzleLeaderboard(token).catch(() => null)
        : Promise.resolve(null),
    ]);
    const rank = leaderboard?.find((entry) => entry.playerId === user.id)?.rank;
    return {
      ...progress,
      rank: rank ?? null,
    };
  }

  errorMessage(error: unknown): string {
    return error instanceof PlatformApiError
      ? error.message
      : "Something went wrong. Please try again.";
  }
}

export const accountService = new AccountService();
