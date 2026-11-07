import { expect, test } from "bun:test";
import { mainMenuMarkup } from "../../app/scenes/mainMenuScene";

test("keeps unresolved level progress hidden on the initial menu render", () => {
  const markup = mainMenuMarkup();

  expect(markup).toContain('class="menu-progress-card" hidden');
  expect(markup).not.toContain("Level 1");
});
