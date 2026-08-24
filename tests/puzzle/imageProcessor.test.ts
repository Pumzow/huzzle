import { expect, test } from "bun:test";
import { squareCrop } from "../../app/systems/imageProcessor";

test("centers a square crop in landscape images", () => {
  expect(squareCrop(1600, 900)).toEqual({ x: 350, y: 0, size: 900 });
});

test("centers a square crop in portrait images", () => {
  expect(squareCrop(900, 1600)).toEqual({ x: 0, y: 350, size: 900 });
});

test("leaves square images unchanged", () => {
  expect(squareCrop(1200, 1200)).toEqual({ x: 0, y: 0, size: 1200 });
});
