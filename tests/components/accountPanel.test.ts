import { describe, expect, test } from "bun:test";

import { accountPanelMarkup, formatCompactPoints } from "../../app/components/accountPanel";

test("formats points to fit the account summary", () => {
  expect(formatCompactPoints(950, "en-US")).toBe("950");
  expect(formatCompactPoints(2100, "en-US")).toBe("2.1k");
  expect(formatCompactPoints(2100, "de-DE")).toBe("2,1k");
  expect(formatCompactPoints(2000, "en-US")).toBe("2k");
  expect(formatCompactPoints(999999, "en-US")).toBe("1M");
});

describe("account panel markup", () => {
  test("contains guest authentication and player progress", () => {
    const markup = accountPanelMarkup();

    expect(markup).toContain("account-login-form");
    expect(markup).toContain("account-register-form");
    expect(markup).toContain("account-profile-trigger");
    expect(markup).toContain("account-user-view");
    expect(markup).toContain("account-user-heading");
    expect(markup).toContain("account-player-level");
    expect(markup).toContain("account-player-points");
    expect(markup).toContain("account-player-rank");
    expect(markup).toContain("account-logout");
    expect(markup).not.toContain('<p class="eyebrow">DRYGON account</p>');
    expect(markup).not.toContain("Player ID");
    expect(markup).not.toContain("Huzzle profile");
    expect(markup).not.toContain("Connected");
    expect(markup).not.toContain("leaderboard-list");
  });
});
