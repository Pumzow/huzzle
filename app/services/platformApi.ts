import { appConfig } from "../config/appConfig";
import { huzzle } from "drygon-huzzle-rules";
import type { GridSize, TileShapeTypes } from "../types/gameTypes";

export type PlatformUser = {
  id: string;
  username: string;
  avatar?: string;
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

type LoginResponse = PlatformUser & { token: string };
type RegistrationResponse = { message: string };
type AuthenticationResponse = { id: string };

export class PlatformApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PlatformApiError";
  }
}

export class PlatformApi {
  constructor(
    private readonly baseUrl = appConfig.platform.apiBaseUrl,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  login(username: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  register(username: string, email: string, password: string): Promise<RegistrationResponse> {
    return this.request<RegistrationResponse>("/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  }

  authenticate(token: string): Promise<AuthenticationResponse> {
    return this.request<AuthenticationResponse>("/auth", { token });
  }

  enterHuzzle(token: string): Promise<GameEntry> {
    return this.request<GameEntry>("/games/huzzle/enter", {
      method: "POST",
      token,
    });
  }

  getHuzzleProgress(token: string): Promise<HuzzleProgress> {
    return this.request<HuzzleProgress>("/games/huzzle/progress", { token });
  }

  getHuzzleLeaderboard(
    token: string,
    period: HuzzleLeaderboardPeriod = "weekly",
  ): Promise<HuzzleLeaderboardEntry[]> {
    return this.request<HuzzleLeaderboardEntry[]>(`/games/huzzle/leaderboard?period=${period}`, { token });
  }

  saveHuzzleProgress(
    token: string,
    currentLevel: number,
    points: number,
    totalPoints: number,
  ): Promise<HuzzleProgress> {
    return this.request<HuzzleProgress>("/games/huzzle/progress", {
      method: "PUT",
      token,
      body: JSON.stringify({ currentLevel, points, totalPoints, rulesVersion: huzzle.config.rulesVersion }),
    });
  }

  completeHuzzleLevel(
    token: string,
    currentLevel: number,
    stars: number,
    gridSize: GridSize,
    tileShape: TileShapeTypes,
  ): Promise<HuzzleCompletion> {
    return this.request<HuzzleCompletion>("/games/huzzle/progress/complete", {
      method: "POST",
      token,
      body: JSON.stringify({ currentLevel, stars, gridSize, tileShape, rulesVersion: huzzle.config.rulesVersion }),
    });
  }

  logout(token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/logout", {
      method: "POST",
      token,
    });
  }

  private async request<Response>(
    path: string,
    options: RequestInit & { token?: string } = {},
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body) headers.set("Content-Type", "application/json");
    if (options.token) headers.set("Authorization", options.token);

    let response: globalThis.Response;
    try {
      response = await this.fetcher.call(globalThis, `${this.baseUrl}${path}`, { ...options, headers });
    } catch (error) {
      console.error("DRYGON API request failed before receiving a response.", error);
      throw new PlatformApiError("Unable to reach the DRYGON server.", 0);
    }

    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      throw new PlatformApiError(payload.error ?? `Request failed (${response.status}).`, response.status);
    }

    return payload as Response;
  }
}

export const platformApi = new PlatformApi();
