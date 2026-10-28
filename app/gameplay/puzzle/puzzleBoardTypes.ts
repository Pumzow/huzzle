import type { Container, Graphics } from "pixi.js";

export type PuzzleTile = {
  row: number;
  col: number;
  group: number;
  slot: number;
  view: Container;
  outline: Graphics;
  connectionOutline: Graphics;
};

export type GridCoordinate = { q: number; r: number };

export type ActivePuzzleDrag = {
  anchor: PuzzleTile;
  members: PuzzleTile[];
  start: { x: number; y: number };
  origins: Map<PuzzleTile, { x: number; y: number }>;
  pointerCaptureTarget?: EventTarget & {
    hasPointerCapture(pointerId: number): boolean;
    releasePointerCapture(pointerId: number): void;
  };
};
