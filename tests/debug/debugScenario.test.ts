import { describe, expect, test } from "bun:test";

import { debugGroupsFromCells } from "../../app/debug/debugScenario";

describe("debug puzzle scenarios", () => {
  test("collects every painted stroke as a slot group", () => {
    expect(
      debugGroupsFromCells([1, 1, null, 2, null, 2, 3, null, 3]),
    ).toEqual([
      [0, 1],
      [3, 5],
      [6, 8],
    ]);
  });

  test("ignores unpainted cells", () => {
    expect(debugGroupsFromCells([null, null, null, null])).toEqual([]);
  });
});
