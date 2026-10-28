import { describe, expect, test } from "bun:test";
import { buildDebugPuzzleLayout } from "../../app/debug/debugPuzzleLayout";

const squareGeometry = (size: number) => ({
  slotCount: size * size,
  coordinateForSlot: (slot: number) => ({
    q: slot % size,
    r: Math.floor(slot / size),
  }),
  slotForCoordinate: ({ q, r }: { q: number; r: number }) =>
    q >= 0 && q < size && r >= 0 && r < size ? r * size + q : undefined,
  random: () => 0,
});

describe("debug puzzle layout", () => {
  test("keeps every painted group in its original relative arrangement", () => {
    const layout = buildDebugPuzzleLayout(
      [
        [0, 1],
        [2, 3],
      ],
      squareGeometry(2),
    );

    expect(layout[1] - layout[0]).toBe(1);
    expect(layout[3] - layout[2]).toBe(1);
    expect(new Set(layout).size).toBe(4);
  });

  test("fills unpainted cells with unique single tiles", () => {
    const layout = buildDebugPuzzleLayout([[0, 1, 4, 5]], squareGeometry(4));

    expect(new Set(layout).size).toBe(16);
    expect(layout[1] - layout[0]).toBe(1);
    expect(layout[4] - layout[0]).toBe(4);
    expect(layout[5] - layout[4]).toBe(1);
  });
});
