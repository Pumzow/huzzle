import { expect, test } from "bun:test";

import { appHeaderMarkup } from "../../app/components/appHeader";

test("renders independent music and sound-effect controls", () => {
  const markup = appHeaderMarkup(true);

  expect(markup).toContain("music-toggle");
  expect(markup).toContain("sfx-toggle");
  expect(markup).toContain("theme-toggle");
  expect(markup).toContain("menu-back");
});
