import { expect, test } from "bun:test";
import type { Container, FederatedPointerEvent } from "pixi.js";

import { PuzzleBoardInteraction } from "../../app/gameplay/puzzle/puzzleBoardInteraction";
import type { PuzzleTile } from "../../app/gameplay/puzzle/puzzleBoardTypes";

test("cancelling an interrupted drag restores tile interaction", () => {
  let pointerDown: ((event: FederatedPointerEvent) => void) | undefined;
  let returnedToBoard = 0;
  let movedToDragLayer = 0;
  let reported = 0;
  const view = {
    x: 12,
    y: 24,
    cursor: "grab",
    on: (event: string, handler: (pointerEvent: FederatedPointerEvent) => void) => {
      if (event === "pointerdown") pointerDown = handler;
    },
  } as unknown as Container;
  const tile = {
    row: 0,
    col: 0,
    group: 0,
    slot: 0,
    view,
  } as PuzzleTile;

  const interaction = new PuzzleBoardInteraction({
    stage: {} as Container,
    tileLayer: { addChild: () => { returnedToBoard += 1; } } as unknown as Container,
    dragLayer: { addChild: () => { movedToDragLayer += 1; } } as unknown as Container,
    tiles: [tile],
    occupancy: [tile, undefined, undefined, undefined],
    gridSize: 2,
    initialSlots: [0, 1, 2, 3],
    random: Math.random,
    scoring: {
      startingStars: 3,
      pointsPerStar: 100,
      gridSizeMultipliers: {},
      tileShapeMultipliers: {},
      baseTime: 20,
      secondsPerStartingSet: 7,
      moveAllowanceMultiplier: 0.5,
      minimumFreeMoves: 4,
    },
    geometry: {} as never,
    effects: {
      stopConnectionPulsesFor: () => undefined,
      stopTileMotion: () => undefined,
      moveOutlineToDragLayer: () => undefined,
      attachOutlineToTile: () => undefined,
      moveTilesToSlots: (members: PuzzleTile[], animate: boolean, settled: (member: PuzzleTile) => void) => {
        expect(animate).toBe(false);
        members.forEach(settled);
      },
    } as never,
    connections: {
      membersFor: () => [tile],
      recompute: () => ({ groups: 1, won: false }),
      markReported: () => undefined,
    } as never,
    onProgress: () => { reported += 1; },
    onStart: () => undefined,
  });
  interaction.bindTile(tile);

  pointerDown?.({ pointerId: 1, global: { x: 20, y: 30 } } as FederatedPointerEvent);
  expect(view.cursor).toBe("grabbing");
  interaction.cancelActiveDrags();

  expect(view.cursor).toBe("grab");
  expect(returnedToBoard).toBe(1);
  expect(reported).toBe(1);

  pointerDown?.({ pointerId: 2, global: { x: 25, y: 35 } } as FederatedPointerEvent);
  expect(view.cursor).toBe("grabbing");
  expect(movedToDragLayer).toBe(2);
});
