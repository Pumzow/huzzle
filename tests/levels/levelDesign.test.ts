import { expect, test } from "bun:test";

import { puzzleSceneConfig } from "../../app/config/scenes/puzzleSceneConfig";
import { levelDesignFor, randomForLevel } from "../../app/systems/levelDesign";

test("repeats the configured grid-size sequence", () => {
  const config = { ...puzzleSceneConfig.levels, enabledShapes: puzzleSceneConfig.enabledShapes };
  const sizes = Array.from({ length: 12 }, (_, levelId) =>
    levelDesignFor(levelId, config).gridSize
  );

  const cycleLength = config.gridSizeSequence.length;
  expect(sizes.slice(0, cycleLength)).toEqual(config.gridSizeSequence);
  expect(sizes.slice(cycleLength, cycleLength * 2)).toEqual(config.gridSizeSequence);
});

test("selects enabled shapes deterministically from the level ID", () => {
  const config = { ...puzzleSceneConfig.levels, enabledShapes: puzzleSceneConfig.enabledShapes };
  const first = levelDesignFor(17, config);
  const repeated = levelDesignFor(17, config);

  expect(repeated).toEqual(first);
  expect(puzzleSceneConfig.enabledShapes.map(({ value }) => value)).toContain(first.tileShape);
  expect(first.tileShape).not.toBe("octagon");
});

test("selects shapes across configured weight boundaries", () => {
  const config = {
    ...puzzleSceneConfig.levels,
    enabledShapes: [
      { value: "square" as const, weight: 2 },
      { value: "card" as const, weight: 1 },
      { value: "verticalHexagon" as const, weight: 1 },
    ],
  };

  expect(levelDesignFor(0, config, () => 0).tileShape).toBe("square");
  expect(levelDesignFor(0, config, () => 2 / 4).tileShape).toBe("card");
  expect(levelDesignFor(0, config, () => 3 / 4).tileShape).toBe("verticalHexagon");
});

test("uses independent deterministic streams for level randomization", () => {
  const firstShuffle = randomForLevel(8, "shuffle", true);
  const repeatedShuffle = randomForLevel(8, "shuffle", true);
  const shape = randomForLevel(8, "shape", true);

  expect([firstShuffle(), firstShuffle()]).toEqual([repeatedShuffle(), repeatedShuffle()]);
  expect(randomForLevel(8, "shuffle", true)()).not.toBe(shape());
});
