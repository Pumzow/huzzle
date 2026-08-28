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

  test("surfaces the server error message", async () => {
    const fetcher = async () => Response.json({ error: "Email not verified" }, { status: 400 });
    const api = new PlatformApi("", fetcher as typeof fetch);

    expect(api.login("Ada", "password")).rejects.toEqual(
      new PlatformApiError("Email not verified", 400),
    );
  });
});
