import { expect, test } from "bun:test";

import { appHeaderMarkup } from "../../app/components/common/appHeader";

test("renders centered branding, navigation, and the settings panel", () => {
  const markup = appHeaderMarkup(true);

  expect(markup).toContain("topbar-brand");
  expect(markup).toContain("settings-trigger");
  expect(markup).toContain("settings-dialog");
  expect(markup).toContain("music-toggle");
  expect(markup).toContain("sfx-toggle");
  expect(markup).toContain("haptics-toggle");
  expect(markup).toContain("theme-toggle");
  expect(markup).toContain("menu-back");
});
