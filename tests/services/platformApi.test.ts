import { describe, expect, test } from "bun:test";

import { PlatformApi, PlatformApiError } from "../../app/services/platformApi";

describe("PlatformApi", () => {
  test("logs in through the browser-compatible POST endpoint", async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    const fetcher = async function (this: unknown, url: string | URL | Request, init?: RequestInit) {
      expect(this).toBe(globalThis);
      request = { url: String(url), init };
      return Response.json({ token: "jwt", id: "7", username: "Ada" });
    };
    const api = new PlatformApi("http://localhost:3000", fetcher as typeof fetch);

    const result = await api.login("Ada", "correct horse");

    expect(result.token).toBe("jwt");
    expect(request?.url).toBe("http://localhost:3000/login");
    expect(request?.init?.method).toBe("POST");
    expect(request?.init?.body).toBe(JSON.stringify({ username: "Ada", password: "correct horse" }));
  });

  test("enters Huzzle with the authentication token", async () => {
    let authorization: string | null = null;
    const fetcher = async (_url: string | URL | Request, init?: RequestInit) => {
      authorization = new Headers(init?.headers).get("Authorization");
      return Response.json({ game: { id: "2", slug: "huzzle", name: "Huzzle" }, profile: { id: "7:2" } });
    };
    const api = new PlatformApi("", fetcher as typeof fetch);

    const entry = await api.enterHuzzle("jwt");

    expect(authorization).toBe("jwt");
    expect(entry.profile.id).toBe("7:2");
  });

  test("loads and saves Huzzle progress with the authentication token", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return Response.json({ currentLevel: requests.length, points: 0 });
    };
    const api = new PlatformApi("http://localhost:3000", fetcher as typeof fetch);

    await api.getHuzzleProgress("jwt");
    await api.getHuzzleLeaderboard("jwt");
    await api.saveHuzzleProgress("jwt", 2, 500);
    await api.completeHuzzleLevel("jwt", 3, 2);

    expect(requests[0].url).toBe("http://localhost:3000/games/huzzle/progress");
    expect(requests[0].init?.method).toBeUndefined();
    expect(new Headers(requests[0].init?.headers).get("Authorization")).toBe("jwt");
    expect(requests[1].url).toBe("http://localhost:3000/games/huzzle/leaderboard");
    expect(new Headers(requests[1].init?.headers).get("Authorization")).toBe("jwt");
    expect(requests[2].init?.method).toBe("PUT");
    expect(requests[2].init?.body).toBe(JSON.stringify({ currentLevel: 2, points: 500 }));
    expect(requests[3].url).toBe("http://localhost:3000/games/huzzle/progress/complete");
    expect(requests[3].init?.method).toBe("POST");
    expect(requests[3].init?.body).toBe(JSON.stringify({ currentLevel: 3, stars: 2 }));
  });

  test("surfaces the server error message", async () => {
    const fetcher = async () => Response.json({ error: "Email not verified" }, { status: 400 });
    const api = new PlatformApi("", fetcher as typeof fetch);

    expect(api.login("Ada", "password")).rejects.toEqual(
      new PlatformApiError("Email not verified", 400),
    );
  });
});
