import { expect, test } from "bun:test";
import { mainMenuMarkup } from "../../app/scenes/mainMenuScene";
import { challengeUnlockPanelMarkup } from "../../app/components/panels/challengeUnlockPanel";

test("keeps unresolved level progress hidden on the initial menu render", () => {
  const markup = mainMenuMarkup();

  expect(markup).toContain('class="menu-play-level" data-menu-level hidden');
  expect(markup).toContain('class="menu-points" hidden');
  expect(markup).not.toContain("menu-progress-card");
  expect(markup).not.toContain("Level 1");
});

test("offers Casual and Challenge with contextual menu panels", () => {
  const markup = mainMenuMarkup();

  expect(markup).toContain('data-level-mode="casual"');
  expect(markup).toContain('data-level-mode="challenge"');
  expect(markup).toContain('data-mode-slot="casual"');
  expect(markup).toContain('data-mode-slot="challenge"');
  expect(markup).toContain('data-play-status hidden');
  expect(markup).toContain('class="menu-mode-wheel"');
  expect(markup).toContain("data-mode-wheel data-active-mode=\"casual\" hidden");
  expect(markup).not.toContain("data-mode-previous");
  expect(markup).not.toContain("data-mode-next");
  expect(markup).toContain('<span>Challenge</span></button>');
  expect(markup).not.toContain("menu-mode-picker");
  expect(markup).toContain("how-to-play-panel");
  expect(markup).toContain("leaderboard-panel");
  expect(markup).toContain("Challenge unlocked!");
  expect(markup).not.toContain("Local practice");
  expect(markup).not.toContain("Official levels");
  expect(markup).not.toContain("menu-mode-message");
});

test("uses a single acknowledgement for the Challenge unlock", () => {
  const markup = challengeUnlockPanelMarkup();

  expect(markup.match(/<button/g)).toHaveLength(1);
  expect(markup).toContain("Got it");
  expect(markup).not.toContain("Play Challenge");
  expect(markup).not.toContain("Stay in Casual");
});
