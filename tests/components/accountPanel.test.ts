import { describe, expect, test } from "bun:test";

import { accountPanelMarkup } from "../../app/components/accountPanel";

describe("account panel markup", () => {
  test("contains guest authentication and authenticated account details", () => {
    const markup = accountPanelMarkup();

    expect(markup).toContain("account-login-form");
    expect(markup).toContain("account-register-form");
    expect(markup).toContain("account-profile-trigger");
    expect(markup).toContain("account-user-view");
    expect(markup).toContain("account-user-id");
    expect(markup).toContain("account-profile-id");
    expect(markup).toContain("account-logout");
    expect(markup).not.toContain("leaderboard-list");
  });
});
