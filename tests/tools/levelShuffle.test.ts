import { expect, test } from "bun:test";
import { shuffleManifestRange, shuffledCopy, validateShufflableManifest } from "../../tools/lib/levelShuffle";

const manifest = {
  schemaVersion: 2 as const,
  revision: 4,
  levels: [
    { id: 0, imageId: 100 },
    { id: 1, imageId: 101 },
    { id: 2, imageId: 102 },
    { id: 3, imageId: 103 },
    { id: 4, imageId: 104 },
  ],
};

test("shuffles only levels in the inclusive ID range", () => {
  const shuffled = shuffleManifestRange(manifest, 1, 3, () => 0);

  expect(shuffled.revision).toBe(5);
  expect(shuffled.levels.map((level) => level.id)).toEqual([0, 2, 3, 1, 4]);
  expect(shuffled.levels[0]).toEqual(manifest.levels[0]);
  expect(shuffled.levels[4]).toEqual(manifest.levels[4]);
});

test("forces a changed order when random selection produces the original order", () => {
  expect(shuffledCopy(["a", "b", "c"], () => 0.999)).toEqual(["b", "a", "c"]);
});

test("rejects a range containing fewer than two levels", () => {
  expect(() => shuffleManifestRange(manifest, 2, 2)).toThrow("at least two published levels");
});

test("validates the level manifest before shuffling", () => {
  expect(() => validateShufflableManifest({ schemaVersion: 1, levels: [] }, "Test manifest"))
    .toThrow("not a supported schema-version-2");
});
