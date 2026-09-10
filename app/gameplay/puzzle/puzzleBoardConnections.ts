import { gameConfig } from "../../config/gameConfig";
import type { GridSize } from "../../types/gameTypes";
import type { PuzzleBoardEffects } from "./puzzleBoardEffects";
import type { PuzzleBoardGeometry } from "./puzzleBoardGeometry";
import type { PuzzleTile } from "./puzzleBoardTypes";

export class PuzzleBoardConnections {
  private connectedGroups = new Map<number, PuzzleTile[]>();
  private connectedPairs = new Set<string>();
  private hasReported = false;

  constructor(
    private readonly tiles: PuzzleTile[],
    private readonly occupancy: Array<PuzzleTile | undefined>,
    private readonly gridSize: GridSize,
    private readonly geometry: PuzzleBoardGeometry,
    private readonly effects: PuzzleBoardEffects,
    private readonly onConnection: (connectedTileCount: number) => void = () => undefined,
  ) {}

  membersFor(tile: PuzzleTile): PuzzleTile[] {
    return [...(this.connectedGroups.get(tile.group) ?? [tile])];
  }

  recompute(canWin: boolean): { groups: number; won: boolean } {
    const links = new Map<PuzzleTile, Set<PuzzleTile>>(
      this.tiles.map((tile) => [tile, new Set<PuzzleTile>()]),
    );
    const nextConnectedPairs = new Set<string>();
    const newlyConnectedTiles = new Set<PuzzleTile>();

    for (let slot = 0; slot < this.occupancy.length; slot++) {
      const tile = this.occupancy[slot]!;
      const current = this.geometry.slotCoordinate(slot);
      this.geometry.forwardDirections.forEach((direction) => {
        const neighborSlot = this.geometry.coordinateToSlot({
          q: current.q + direction.q,
          r: current.r + direction.r,
        });
        if (neighborSlot === undefined) return;
        const neighbor = this.occupancy[neighborSlot]!;
        if (!this.areConnectedNeighbors(tile, neighbor)) return;

        const tileId = tile.row * this.gridSize + tile.col;
        const neighborId = neighbor.row * this.gridSize + neighbor.col;
        const pairKey =
          tileId < neighborId
            ? `${tileId}:${neighborId}`
            : `${neighborId}:${tileId}`;
        nextConnectedPairs.add(pairKey);
        if (this.hasReported && !this.connectedPairs.has(pairKey)) {
          newlyConnectedTiles.add(tile);
          newlyConnectedTiles.add(neighbor);
        }
        links.get(tile)!.add(neighbor);
        links.get(neighbor)!.add(tile);
      });
    }

    const visited = new Set<PuzzleTile>();
    this.connectedGroups = new Map();
    let groupCount = 0;
    for (const tile of this.tiles) {
      if (visited.has(tile)) continue;
      const stack = [tile];
      const component: PuzzleTile[] = [];
      visited.add(tile);
      while (stack.length) {
        const current = stack.pop()!;
        component.push(current);
        links.get(current)!.forEach((neighbor) => {
          if (visited.has(neighbor)) return;
          visited.add(neighbor);
          stack.push(neighbor);
        });
      }
      component.forEach((member) => {
        member.group = groupCount;
      });
      this.connectedGroups.set(groupCount, component);
      this.drawComponentOutline(component);
      groupCount += 1;
    }

    this.connectedPairs = nextConnectedPairs;
    const newlyConnectedGroups = new Set(
      [...newlyConnectedTiles].map((tile) => tile.group),
    );
    const highlightedTiles = new Set(
      [...newlyConnectedGroups].flatMap(
        (group) => this.connectedGroups.get(group) ?? [],
      ),
    );
    this.effects.pulseConnections(highlightedTiles);
    const won = canWin && this.tiles.every(
      (tile) => tile.slot === tile.row * this.gridSize + tile.col,
    );
    if (highlightedTiles.size > 0 && !won) this.onConnection(highlightedTiles.size);

    return { groups: groupCount, won };
  }

  markReported(): void {
    this.hasReported = true;
  }

  private areConnectedNeighbors(a: PuzzleTile, b: PuzzleTile): boolean {
    const aOriginal = this.geometry.coordinateFor(a.row, a.col);
    const bOriginal = this.geometry.coordinateFor(b.row, b.col);
    const aPlaced = this.geometry.slotCoordinate(a.slot);
    const bPlaced = this.geometry.slotCoordinate(b.slot);
    return (
      bPlaced.q - aPlaced.q === bOriginal.q - aOriginal.q &&
      bPlaced.r - aPlaced.r === bOriginal.r - aOriginal.r &&
      this.geometry.coordinateDistance(aOriginal, bOriginal) === 1
    );
  }

  private drawComponentOutline(component: PuzzleTile[]): void {
    const componentCoordinates = new Set(
      component.map((tile) =>
        this.geometry.coordinateKey(this.geometry.slotCoordinate(tile.slot)),
      ),
    );
    const style = {
      color: 0xffffff,
      width: gameConfig.pieces.outlineWidth,
      alpha: 0.98,
    };
    component.forEach((member) => {
      const current = this.geometry.slotCoordinate(member.slot);
      [member.outline, member.connectionOutline].forEach((outline) => {
        outline.clear();
        this.geometry.outlineDirections.forEach((direction, edge) => {
          if (direction) {
            const neighbor = {
              q: current.q + direction.q,
              r: current.r + direction.r,
            };
            if (componentCoordinates.has(this.geometry.coordinateKey(neighbor)))
              return;
          }
          const pointIndex = edge * 2;
          const nextPointIndex =
            ((edge + 1) % this.geometry.outlineDirections.length) * 2;
          outline
            .moveTo(
              this.geometry.tilePoints[pointIndex],
              this.geometry.tilePoints[pointIndex + 1],
            )
            .lineTo(
              this.geometry.tilePoints[nextPointIndex],
              this.geometry.tilePoints[nextPointIndex + 1],
            )
            .stroke(style);
        });
      });
    });
  }
}
