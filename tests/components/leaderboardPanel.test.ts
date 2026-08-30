import { describe, expect, test } from "bun:test";

import { leaderboardPanelMarkup } from "../../app/components/leaderboardPanel";

describe("leaderboard panel markup", () => {
  test("owns the menu trigger and authenticated standings", () => {
    const markup = leaderboardPanelMarkup();

    expect(markup).toContain("<strong>Leaderboard</strong>");
    expect(markup).toContain("Huzzle leaderboard");
    expect(markup).toContain("leaderboard-list");
    expect(markup).not.toContain("account-logout");
    expect(markup).not.toContain("account-login-form");
  });
});
