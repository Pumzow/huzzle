import { describe, expect, test } from "bun:test";

import { leaderboardPanelMarkup } from "../../app/components/panels/leaderboardPanel";

describe("leaderboard panel markup", () => {
  test("owns the menu trigger and authenticated standings", () => {
    const markup = leaderboardPanelMarkup();

    expect(markup).toContain("<strong>Leaderboard</strong>");
    expect(markup).toContain('data-period="weekly"');
    expect(markup).toContain('data-period="all-time"');
    expect(markup).toContain("This week");
    expect(markup).toContain("All time");
    expect(markup).toContain("leaderboard-results");
    expect(markup).toContain("leaderboard-list");
    expect(markup).not.toContain("Weekly standings");
    expect(markup).not.toContain("Playing as");
    expect(markup).not.toContain("Huzzle standings");
    expect(markup).not.toContain("account-logout");
    expect(markup).not.toContain("account-login-form");
  });
});
