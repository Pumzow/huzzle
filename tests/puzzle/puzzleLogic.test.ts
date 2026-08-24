import { expect, test } from "bun:test";
import {
  canStartGroupDrag,
  canUseTargetSlot,
  minimumSwapsToSolve,
  moveLimitFor,
  shuffledSlots,
} from "../../app/systems/puzzleLogic";

test("counts the minimum swaps required by a tile permutation", () => {
  expect(minimumSwapsToSolve([0, 1, 2, 3])).toBe(0);
  expect(minimumSwapsToSolve([1, 0, 2, 3])).toBe(1);
  expect(minimumSwapsToSolve([1, 2, 0, 3])).toBe(2);
  expect(minimumSwapsToSolve([1, 0, 3, 2])).toBe(2);
});

test("shuffles deterministically with injected randomness", () => {
  expect(shuffledSlots(2, () => 0)).toEqual([1, 2, 3, 0]);
});

test("forces a playable permutation when random swaps produce identity", () => {
  expect(shuffledSlots(2, () => 0.999)).toEqual([1, 2, 3, 0]);
});

test("adds the larger configured move allowance", () => {
  expect(moveLimitFor(3, 4, 0.5)).toBe(7);
  expect(moveLimitFor(20, 4, 0.5)).toBe(30);
});

test("allows separate simultaneous drags but rejects overlapping groups", () => {
  const first = { id: 1 };
  const second = { id: 2 };
  const third = { id: 3 };

  expect(canStartGroupDrag([third], [[first, second]])).toBe(true);
  expect(canStartGroupDrag([second, third], [[first, second]])).toBe(false);
});

test("protects tiles held by another pointer from displacement", () => {
  const moving = { id: 1 };
  const locked = { id: 2 };
  const free = { id: 3 };
  const movingMembers = new Set([moving]);
  const lockedMembers = new Set([locked]);

  expect(canUseTargetSlot(undefined, movingMembers, lockedMembers)).toBe(true);
  expect(canUseTargetSlot(moving, movingMembers, lockedMembers)).toBe(true);
  expect(canUseTargetSlot(free, movingMembers, lockedMembers)).toBe(true);
  expect(canUseTargetSlot(locked, movingMembers, lockedMembers)).toBe(false);
});
