import { describe, expect, test } from "bun:test";
import {
  offlineLevelVisual,
  offlineVisualFamilies,
} from "../../app/systems/offlineLevelGenerator";

describe("offline level visuals", () => {
  test("are deterministic for the same level", () => {
    expect(offlineLevelVisual(42)).toEqual(offlineLevelVisual(42));
  });

  test("cycle through all ten families before repeating one", () => {
    const families = Array.from({ length: 10 }, (_, index) => offlineLevelVisual(index).family);
    expect(new Set(families).size).toBe(offlineVisualFamilies.length);
  });

  test("provide three compositions for every family in each 30-level cycle", () => {
    const combinations = Array.from({ length: 30 }, (_, index) => {
      const visual = offlineLevelVisual(index);
      return `${visual.family}:${visual.templateIndex}`;
    });
    expect(new Set(combinations).size).toBe(30);
  });

  test("keeps later cycles visually seeded differently", () => {
    expect(offlineLevelVisual(0).family).toBe(offlineLevelVisual(30).family);
    expect(offlineLevelVisual(0).templateIndex).toBe(offlineLevelVisual(30).templateIndex);
    expect(offlineLevelVisual(0).seed).not.toBe(offlineLevelVisual(30).seed);
  });
});
