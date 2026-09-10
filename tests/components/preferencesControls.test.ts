import { describe, expect, test } from "bun:test";

import { preferencesControlsMarkup } from "../../app/components/common/preferencesControls";

describe("preference controls markup", () => {
  test("renders compact header controls", () => {
    const markup = preferencesControlsMarkup("header");

    expect(markup).toContain("topbar-actions");
    expect(markup).toContain("music-toggle");
    expect(markup).toContain("sfx-toggle");
    expect(markup).toContain("haptics-toggle");
    expect(markup).toContain("theme-toggle");
  });

  test("renders labeled menu controls", () => {
    const markup = preferencesControlsMarkup("menu");

    expect(markup).toContain("menu-audio");
    expect(markup).toContain("music-mute");
    expect(markup).toContain("sfx-mute");
    expect(markup).toContain("haptics-mute");
    expect(markup).toContain("menu-theme-toggle");
  });
});
