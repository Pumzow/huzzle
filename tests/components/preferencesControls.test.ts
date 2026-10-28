import { describe, expect, test } from "bun:test";

import { preferencesControlsMarkup } from "../../app/components/common/preferencesControls";

describe("preference controls markup", () => {
  test("renders labeled settings rows", () => {
    const markup = preferencesControlsMarkup();

    expect(markup).toContain("settings-preferences");
    expect(markup.match(/preference-row/g)).toHaveLength(4);
    expect(markup).toContain("music-toggle");
    expect(markup).toContain("sfx-toggle");
    expect(markup).toContain("haptics-toggle");
    expect(markup).toContain("theme-toggle");
  });
});
