import { Container, FederatedPointerEvent, Rectangle } from "pixi.js";
import { buildDebugPuzzleLayout } from "../../debug/debugPuzzleLayout";
import {
  canStartGroupDrag,
  minimumSwapsToSolve,
  moveLimitFor,
} from "../../systems/puzzleLogic";
import type {
  GridSize,
  PuzzleBoardOptions,
  PuzzleBoardState,
  PuzzleProgress,
  PuzzleScoringConfig,
} from "../../types/gameTypes";
import type { PuzzleBoardConnections } from "./puzzleBoardConnections";
import type { PuzzleBoardEffects } from "./puzzleBoardEffects";
import type { PuzzleBoardGeometry } from "./puzzleBoardGeometry";
import type { ActivePuzzleDrag, PuzzleTile } from "./puzzleBoardTypes";
import { findClosestSlot, planGroupRelocation } from "./puzzlePlacement";

type PuzzleBoardInteractionOptions = {
  stage: Container;
  tileLayer: Container;
  dragLayer: Container;
  tiles: PuzzleTile[];
  occupancy: Array<PuzzleTile | undefined>;
  gridSize: GridSize;
  initialSlots: number[];
  initialState?: PuzzleBoardState;
  random: () => number;
  scoring: PuzzleScoringConfig;
  geometry: PuzzleBoardGeometry;
  effects: PuzzleBoardEffects;
  connections: PuzzleBoardConnections;
  onProgress: (progress: PuzzleProgress) => void;
  onStart: PuzzleBoardOptions["onStart"];
};

export class PuzzleBoardInteraction {
  private readonly activeDrags = new Map<number, ActivePuzzleDrag>();
  private readonly settlingTiles = new Set<PuzzleTile>();
  private readonly moveLimit: number;
  private moves: number;
  private won = false;
  private started: boolean;
  private startingGroups: number;

  constructor(private readonly options: PuzzleBoardInteractionOptions) {
    const { initialSlots, initialState, scoring } = options;
    this.moves = initialState?.moves ?? 0;
    this.started = initialState?.started ?? false;
    this.startingGroups = initialState?.startingGroups ?? 0;
    this.moveLimit =
      initialState?.moveLimit ??
      moveLimitFor(
        minimumSwapsToSolve(initialSlots),
        scoring.minimumFreeMoves,
        scoring.moveAllowanceMultiplier,
      );
  }

  bindTile(tile: PuzzleTile): void {
    tile.view.on("pointerdown", (event: FederatedPointerEvent) => {
      this.startDrag(tile, event);
    });
  }

  bindStage(): void {
    const { stage, geometry } = this.options;
    stage.eventMode = "static";
    stage.hitArea = new Rectangle(
      geometry.boardX,
      geometry.boardY,
      geometry.boardWidth,
      geometry.boardHeight,
    );
    stage.on("pointermove", this.moveDrag);
    stage.on("pointerup", this.releaseDrag);
    stage.on("pointerupoutside", this.releaseDrag);
    stage.on("pointercancel", this.releaseDrag);
  }

  reportInitialState(): void {
    this.report();
  }

  applyDebugScenario(slotGroups: readonly number[][], moves: number): boolean {
    if (this.activeDrags.size > 0 || this.settlingTiles.size > 0) return false;
    const { connections, effects, geometry, occupancy, random, tiles } =
      this.options;
    const layout = buildDebugPuzzleLayout(slotGroups, {
      slotCount: occupancy.length,
      coordinateForSlot: (slot) => geometry.slotCoordinate(slot),
      slotForCoordinate: (coordinate) => geometry.coordinateToSlot(coordinate),
      random,
    });
    effects.stopConnectionPulsesFor(tiles);
    occupancy.fill(undefined);
    tiles.forEach((tile) => {
      const sourceSlot = tile.row * this.options.gridSize + tile.col;
      tile.slot = layout[sourceSlot];
      occupancy[tile.slot] = tile;
      effects.attachOutlineToTile(tile);
    });
    effects.moveTilesToSlots(tiles, false);
    this.moves = Math.max(0, Math.trunc(moves));
    this.won = false;
    const result = connections.recompute(false);
    this.startingGroups = result.groups;
    this.options.onProgress({
      slots: tiles.map((tile) => tile.slot),
      moves: this.moves,
      groups: result.groups,
      won: false,
      startingGroups: this.startingGroups,
      moveLimit: this.moveLimit,
    });
    return true;
  }

  applyDebugMoves(moves: number): boolean {
    if (this.activeDrags.size > 0 || this.settlingTiles.size > 0) return false;
    this.moves = Math.max(0, Math.trunc(moves));
    this.report();
    return true;
  }

  completeDebugPuzzle(): boolean {
    if (this.activeDrags.size > 0 || this.settlingTiles.size > 0) return false;
    const { effects, gridSize, occupancy, tiles } = this.options;
    effects.stopConnectionPulsesFor(tiles);
    occupancy.fill(undefined);
    tiles.forEach((tile) => {
      tile.slot = tile.row * gridSize + tile.col;
      occupancy[tile.slot] = tile;
      effects.attachOutlineToTile(tile);
    });
    effects.moveTilesToSlots(tiles, false);
    this.won = false;
    this.report();
    return true;
  }

  destroy(): void {
    const { stage } = this.options;
    stage.off("pointermove", this.moveDrag);
    stage.off("pointerup", this.releaseDrag);
    stage.off("pointerupoutside", this.releaseDrag);
    stage.off("pointercancel", this.releaseDrag);
    this.activeDrags.clear();
    this.settlingTiles.clear();
  }

  private readonly moveDrag = (event: FederatedPointerEvent) => {
    const drag = this.activeDrags.get(event.pointerId);
    if (!drag) return;
    const { geometry, effects } = this.options;
    const rawDx = event.global.x - drag.start.x;
    const rawDy = event.global.y - drag.start.y;
    const origins = [...drag.origins.values()];
    const minX = Math.min(...origins.map((position) => position.x));
    const minY = Math.min(...origins.map((position) => position.y));
    const maxX = Math.max(
      ...origins.map((position) => position.x + geometry.tileWidth),
    );
    const maxY = Math.max(
      ...origins.map((position) => position.y + geometry.tileHeight),
    );
    const dx = Math.max(
      geometry.startX - minX,
      Math.min(geometry.startX + geometry.gridWidth - maxX, rawDx),
    );
    const dy = Math.max(
      geometry.startY - minY,
      Math.min(geometry.startY + geometry.gridHeight - maxY, rawDy),
    );
    drag.members.forEach((tile) => {
      const origin = drag.origins.get(tile)!;
      effects.setTileTransform(tile, origin.x + dx, origin.y + dy);
    });
  };

  private readonly releaseDrag = (event: FederatedPointerEvent) => {
    const drag = this.activeDrags.get(event.pointerId);
    if (!drag) return;
    this.activeDrags.delete(event.pointerId);
    drag.members.forEach((tile) => {
      tile.view.cursor = "grab";
    });

    const { geometry, occupancy } = this.options;
    const requestedSlot = findClosestSlot(
      {
        x: drag.anchor.view.x + geometry.tileWidth / 2,
        y: drag.anchor.view.y + geometry.tileHeight / 2,
      },
      occupancy.length,
      geometry,
    );

    this.relocateGroup(drag.anchor, drag.members, requestedSlot);
  };

  private startDrag(tile: PuzzleTile, event: FederatedPointerEvent): void {
    if (this.won || this.settlingTiles.has(tile)) return;
    const { connections, effects, dragLayer, onStart } = this.options;
    const members = connections.membersFor(tile);
    if (
      this.activeDrags.has(event.pointerId) ||
      members.some((member) => this.settlingTiles.has(member)) ||
      !canStartGroupDrag(
        members,
        [...this.activeDrags.values()].map((drag) => drag.members),
      )
    )
      return;

    effects.stopConnectionPulsesFor(members);
    if (!this.started) {
      this.started = true;
      onStart();
    }
    const origins = new Map<PuzzleTile, { x: number; y: number }>();
    this.activeDrags.set(event.pointerId, {
      anchor: tile,
      members,
      start: { x: event.global.x, y: event.global.y },
      origins,
    });
    members.forEach((member) => {
      effects.stopTileMotion(member);
      origins.set(member, { x: member.view.x, y: member.view.y });
      member.view.cursor = "grabbing";
      dragLayer.addChild(member.view);
      effects.moveOutlineToDragLayer(member);
    });
  }

  private relocateGroup(
    anchor: PuzzleTile,
    members: PuzzleTile[],
    requestedSlot: number,
  ): void {
    const { geometry, gridSize, occupancy, effects } = this.options;
    const lockedTiles = new Set(
      [...this.activeDrags.values()].flatMap((drag) => drag.members),
    );
    const relocation = planGroupRelocation(
      anchor,
      members,
      requestedSlot,
      lockedTiles,
      occupancy,
      gridSize,
      geometry,
    );
    if (!relocation) {
      members.forEach((tile) => this.settlingTiles.add(tile));
      effects.moveTilesToSlots(members, true, (tile) => {
        this.settlingTiles.delete(tile);
        this.returnTileToBoard(tile);
      });
      return;
    }

    const originSlots = members.map((tile) => tile.slot);
    const displaced = relocation.displacedAssignments.map(({ tile }) => tile);
    effects.stopConnectionPulsesFor(displaced);

    new Set([
      ...originSlots,
      ...relocation.targetSlots,
      ...relocation.displacedAssignments.map(({ tile }) => tile.slot),
    ]).forEach((slot) => {
      occupancy[slot] = undefined;
    });
    members.forEach((tile, index) => {
      tile.slot = relocation.targetSlots[index];
      occupancy[tile.slot] = tile;
    });
    relocation.displacedAssignments.forEach(({ tile, slot }) => {
      tile.slot = slot;
      occupancy[slot] = tile;
    });

    this.moves += 1;
    let tilesAwaitingLanding = members.length + displaced.length;
    [...members, ...displaced].forEach((tile) =>
      this.settlingTiles.add(tile),
    );
    const reportAfterLanding = (tile: PuzzleTile) => {
      this.settlingTiles.delete(tile);
      tilesAwaitingLanding -= 1;
      if (tilesAwaitingLanding === 0) this.report();
    };
    effects.moveTilesToSlots(members, true, (tile) => {
      this.returnTileToBoard(tile);
      reportAfterLanding(tile);
    });
    relocation.displacedMoveGroups.forEach((group) =>
      effects.moveTilesToSlots(group, true, reportAfterLanding),
    );
  }

  private returnTileToBoard(tile: PuzzleTile): void {
    this.options.effects.attachOutlineToTile(tile);
    this.options.tileLayer.addChild(tile.view);
  }

  private report(): void {
    const { connections, onProgress, tiles } = this.options;
    const result = connections.recompute(this.activeDrags.size === 0);
    this.won = result.won;
    if (this.startingGroups === 0) this.startingGroups = result.groups;
    onProgress({
      slots: tiles.map((tile) => tile.slot),
      moves: this.moves,
      groups: result.groups,
      won: this.won,
      startingGroups: this.startingGroups,
      moveLimit: this.moveLimit,
    });
    connections.markReported();
  }
}
