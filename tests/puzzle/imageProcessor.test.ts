import { expect, test } from "bun:test";
import { centerCrop, squareCrop } from "../../app/systems/imageProcessor";

test("centers a square crop in landscape images", () => {
  expect(squareCrop(1600, 900)).toEqual({ x: 350, y: 0, size: 900 });
});

test("centers a square crop in portrait images", () => {
  expect(squareCrop(900, 1600)).toEqual({ x: 0, y: 350, size: 900 });
});

test("leaves square images unchanged", () => {
  expect(squareCrop(1200, 1200)).toEqual({ x: 0, y: 0, size: 1200 });
});

test("centers a portrait card crop without stretching", () => {
  expect(centerCrop(1200, 1200, 0.75)).toEqual({
    x: 150,
    y: 0,
    width: 900,
    height: 1200,
  });
  expect(centerCrop(900, 1600, 0.75)).toEqual({
    x: 0,
    y: 200,
    width: 900,
    height: 1200,
  });
});
