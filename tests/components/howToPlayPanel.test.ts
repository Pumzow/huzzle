import { expect, test } from "bun:test";
import {
  howToPlayInputCopy,
  howToPlayPanelMarkup,
} from "../../app/components/panels/howToPlayPanel";

test("uses touch instructions on mobile without mentioning a mouse", () => {
  const copy = howToPlayInputCopy("mobile-web");

  expect(copy.instruction).toContain("Release your finger");
  expect(copy.instruction.toLowerCase()).not.toContain("mouse");
});

test("uses mouse instructions on desktop", () => {
  const copy = howToPlayInputCopy("desktop");

  expect(copy.instruction).toContain("Release the mouse button");
  expect(copy.instruction.toLowerCase()).not.toContain("finger");
});

test("explains the core puzzle rules", () => {
  const markup = howToPlayPanelMarkup();

  expect(markup).toContain("Put the pieces together");
  expect(markup).toContain("Move tiles together");
  expect(markup).toContain("Go for three stars");
  expect(markup).not.toContain("Casual guide");
});

