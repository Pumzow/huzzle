import { expect, test } from "bun:test";
import { appConfig } from "../../app/config/appConfig";
import { gameConfig } from "../../app/config/gameConfig";

test("defines the supported puzzle sizes and shapes", () => {
  expect(gameConfig.grid.defaultSize).toBe(4);
  expect(gameConfig.grid.sizes).toEqual([4, 6, 8]);
  expect(gameConfig.pieces.defaultShape).toBe("square");
  expect(gameConfig.pieces.shapes).toEqual([
    { value: "square", label: "Square" },
    { value: "hexagon", label: "Hexagon" },
    { value: "verticalHexagon", label: "Vertical hex" },
    { value: "octagon", label: "Octagon" },
  ]);
});

test("defines scoring allowances and seamless piece rendering", () => {
  expect(gameConfig.pieces.gap).toBe(0);
  expect(gameConfig.scoring).toEqual({
    startingStars: 3,
    baseTimeSeconds: 20,
    secondsPerStartingSet: 7,
    moveAllowanceMultiplier: 0.5,
    minimumFreeMoves: 4,
  });
});

test("defines independent music and sound-effect preferences", () => {
  expect(appConfig.soundtrack).toMatchObject({
    enabled: true,
    file: "sounds/huzzle-soundtrack.wav",
    loop: true,
    storageKey: "huzzle-music-muted",
  });
  expect(appConfig.sfx.storageKey).toBe("huzzle-sfx-muted");
});
