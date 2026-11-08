import { expect, test } from "bun:test";
import { mainMenuMarkup } from "../../app/scenes/mainMenuScene";
import { challengeUnlockPanelMarkup } from "../../app/components/panels/challengeUnlockPanel";

test("keeps unresolved level progress hidden on the initial menu render", () => {
  const markup = mainMenuMarkup();

  expect(markup).toContain('class="menu-progress-card" hidden');
  expect(markup).not.toContain("Level 1");
});

test("offers Casual and Challenge with contextual menu panels", () => {
  const markup = mainMenuMarkup();

  expect(markup).toContain('data-level-mode="casual"');
  expect(markup).toContain('data-level-mode="challenge"');
  expect(markup).toContain("how-to-play-panel");
  expect(markup).toContain("leaderboard-panel");
  expect(markup).toContain("Challenge unlocked!");
  expect(markup).not.toContain("Local practice");
  expect(markup).not.toContain("Official levels");
});

test("uses a single acknowledgement for the Challenge unlock", () => {
  const markup = challengeUnlockPanelMarkup();

  expect(markup.match(/<button/g)).toHaveLength(1);
  expect(markup).toContain("Got it");
  expect(markup).not.toContain("Play Challenge");
  expect(markup).not.toContain("Stay in Casual");
});
