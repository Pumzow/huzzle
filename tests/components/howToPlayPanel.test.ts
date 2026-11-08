import { expect, test } from "bun:test";
import {
  howToPlayInputCopy,
  howToPlayPanelMarkup,
} from "../../app/components/panels/howToPlayPanel";

test("uses touch instructions on mobile without mentioning a mouse", () => {
  const copy = howToPlayInputCopy("mobile-web");

  expect(copy.action).toContain("Touch");
  expect(`${copy.action} ${copy.release}`.toLowerCase()).not.toContain("mouse");
});

test("uses mouse instructions on desktop", () => {
  const copy = howToPlayInputCopy("desktop");

  expect(copy.action).toContain("Click and drag");
  expect(copy.release).toContain("mouse button");
});

test("explains the core puzzle rules", () => {
  const markup = howToPlayPanelMarkup();

  expect(markup).toContain("Connected tiles");
  expect(markup).toContain("Moves and time affect the stars");
  expect(markup).not.toContain("Official levels");
});

