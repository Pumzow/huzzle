import { Application, Container, FederatedPointerEvent, Graphics, Polygon, Rectangle, Sprite, Texture, Ticker } from "pixi.js";
import { gameConfig } from "../../config/gameConfig";
import { loadImage, normalizeImage } from "../../systems/imageProcessor";
import { GridSize, PuzzleBoardOptions } from "../../types/gameTypes";

const BOARD_MARGIN = gameConfig.board.margin;
const TILE_GAP = gameConfig.pieces.gap;
const MOVE_DURATION = gameConfig.board.moveDurationMs;
const TILE_TEXTURE_SIZE = gameConfig.pieces.textureSize;
type Tile = {
  row: number;
  col: number;
  group: number;
  slot: number;
  view: Container;
  outline: Graphics;
};

type GridCoordinate = { q: number; r: number };

function shuffledSlots(gridSize: GridSize): number[] {
  const result = Array.from({ length: gridSize * gridSize }, (_, index) => index);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.every((slot, index) => slot === index)) result.push(result.shift()!);
  return result;
}

function minimumSwapsToSolve(slots: number[]): number {
  const visited = Array(slots.length).fill(false);
  let swaps = 0;
  for (let start = 0; start < slots.length; start++) {
    if (visited[start] || slots[start] === start) continue;
    let cycleLength = 0;
    let current = start;
    while (!visited[current]) {
      visited[current] = true;
      current = slots[current];
      cycleLength += 1;
    }
    swaps += cycleLength - 1;
  }
  return swaps;
}

function mountPuzzleBoard(host: HTMLDivElement, options: PuzzleBoardOptions): () => void {
    const { imageUrl, gridSize, tileShape, onProgress, onStart } = options;
    let disposed = false;
    let app: Application | null = null;

    const start = async () => {
      const application = new Application();
      await application.init({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: host,
        resolution: Math.min(Math.ceil(window.devicePixelRatio || 1), 2),
        autoDensity: true,
      });
      if (disposed) {
        application.destroy(true, { children: true, texture: true });
        return;
      }
      app = application;
      host.appendChild(app.canvas);

      const image = await loadImage(imageUrl);
      if (disposed || !app) return;

      const textureSize = gridSize * TILE_TEXTURE_SIZE;
      const normalizedImage = normalizeImage(image, textureSize);
      const baseTexture = Texture.from(normalizedImage);
      const sourceCell = textureSize / gridSize;
      const width = app.screen.width;
      const height = app.screen.height;
      const availableSize = Math.max(240, Math.floor(Math.min(width, height) - BOARD_MARGIN * 2));
      const hexWidthFactor = .75 * gridSize + .25;
      const hexHeightFactor = Math.sqrt(3) / 2 * (gridSize + .5);
      const tileWidth = tileShape === "hexagon"
        ? Math.max(24, Math.floor(availableSize / Math.max(hexWidthFactor, hexHeightFactor) / 4) * 4)
        : Math.floor(availableSize / gridSize);
      const tileHeight = tileShape === "hexagon" ? Math.round(tileWidth * Math.sqrt(3) / 2) : tileWidth;
      const horizontalStep = tileShape === "hexagon" ? tileWidth * .75 : tileWidth;
      const gridWidth = tileShape === "hexagon" ? tileWidth + horizontalStep * (gridSize - 1) : tileWidth * gridSize;
      const gridHeight = tileShape === "hexagon" ? tileHeight * (gridSize + .5) : tileHeight * gridSize;
      const boardSize = availableSize;
      const boardX = Math.round((width - boardSize) / 2);
      const boardY = Math.round((height - boardSize) / 2);
      const startX = Math.round((width - gridWidth) / 2);
      const startY = Math.round((height - gridHeight) / 2);
      const hexImageSize = Math.max(gridWidth, gridHeight);
      const hexImageX = startX + (gridWidth - hexImageSize) / 2;
      const hexImageY = startY + (gridHeight - hexImageSize) / 2;
      const initialSlots = shuffledSlots(gridSize);

      const board = new Graphics()
        .roundRect(boardX - 4, boardY - 4, boardSize + 8, boardSize + 8, 18)
        .fill({ color: 0x123d3f, alpha: .82 })
        .stroke({ color: 0x8fbfb0, width: 1.5, alpha: .34 });
      app.stage.addChild(board);

      const tiles: Tile[] = [];
      const occupancy: Array<Tile | undefined> = Array(gridSize * gridSize);
      const tweens = new Map<Tile, (ticker: Ticker) => void>();
      let connectedGroups = new Map<number, Tile[]>();
      let activeTile: Tile | null = null;
      let activeGroup: Tile[] = [];
      let dragStart = { x: 0, y: 0 };
      let dragOrigins = new Map<Tile, { x: number; y: number }>();
      let moves = 0;
      let won = false;
      let started = false;
      let startingGroups = 0;
      const requiredMoves = minimumSwapsToSolve(initialSlots);
      const moveLimit = requiredMoves + Math.max(gameConfig.scoring.minimumFreeMoves, Math.ceil(requiredMoves * gameConfig.scoring.moveAllowanceMultiplier));

      const coordinateFor = (row: number, col: number): GridCoordinate => tileShape === "hexagon"
        ? { q: col, r: row - Math.floor(col / 2) }
        : { q: col, r: row };

      const slotCoordinate = (slot: number) => coordinateFor(Math.floor(slot / gridSize), slot % gridSize);

      const coordinateKey = ({ q, r }: GridCoordinate) => `${q}:${r}`;

      const coordinateToSlot = ({ q, r }: GridCoordinate): number | undefined => {
        const col = q;
        const row = tileShape === "hexagon" ? r + Math.floor(q / 2) : r;
        if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= gridSize || col < 0 || col >= gridSize) return undefined;
        return row * gridSize + col;
      };

      const directions: GridCoordinate[] = tileShape === "hexagon"
        ? [{ q: 0, r: -1 }, { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 }]
        : [{ q: 0, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 0 }];

      const forwardDirections = tileShape === "hexagon" ? directions.slice(1, 4) : directions.slice(1, 3);

      const coordinateDistance = (a: GridCoordinate, b: GridCoordinate) => {
        const dq = a.q - b.q;
        const dr = a.r - b.r;
        return tileShape === "hexagon" ? (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2 : Math.abs(dq) + Math.abs(dr);
      };

      const slotPosition = (slot: number) => {
        const row = Math.floor(slot / gridSize);
        const col = slot % gridSize;
        return {
          x: startX + col * (horizontalStep + TILE_GAP),
          y: startY + row * (tileHeight + TILE_GAP) + (tileShape === "hexagon" && col % 2 ? tileHeight / 2 : 0),
        };
      };

      const octagonCut = tileWidth * (1 - Math.SQRT1_2);
      const tilePoints = tileShape === "hexagon"
        ? [tileWidth * .25, 0, tileWidth * .75, 0, tileWidth, tileHeight / 2, tileWidth * .75, tileHeight, tileWidth * .25, tileHeight, 0, tileHeight / 2]
        : tileShape === "octagon"
          ? [octagonCut, 0, tileWidth - octagonCut, 0, tileWidth, octagonCut, tileWidth, tileHeight - octagonCut, tileWidth - octagonCut, tileHeight, octagonCut, tileHeight, 0, tileHeight - octagonCut, 0, octagonCut]
          : [0, 0, tileWidth, 0, tileWidth, tileHeight, 0, tileHeight];
      const outlineDirections: Array<GridCoordinate | null> = tileShape === "octagon"
        ? [directions[0], null, directions[1], null, directions[2], null, directions[3], null]
        : directions;

      const moveToSlot = (tile: Tile, animate = true) => {
        const target = slotPosition(tile.slot);
        const oldTween = tweens.get(tile);
        if (oldTween) app?.ticker.remove(oldTween);
        if (!animate) { tile.view.position.set(target.x, target.y); return; }
        const from = { x: tile.view.x, y: tile.view.y };
        let elapsed = 0;
        const tween = (ticker: Ticker) => {
          elapsed += ticker.deltaMS;
          const raw = Math.min(1, elapsed / MOVE_DURATION);
          const eased = 1 - Math.pow(1 - raw, 3);
          tile.view.position.set(
            from.x + (target.x - from.x) * eased,
            from.y + (target.y - from.y) * eased,
          );
          if (raw === 1) {
            app?.ticker.remove(tween);
            tweens.delete(tile);
          }
        };
        tweens.set(tile, tween);
        app?.ticker.add(tween);
      };

      const connectedNeighbors = (a: Tile, b: Tile): boolean => {
        const aOriginal = coordinateFor(a.row, a.col);
        const bOriginal = coordinateFor(b.row, b.col);
        const aPlaced = slotCoordinate(a.slot);
        const bPlaced = slotCoordinate(b.slot);
        return bPlaced.q - aPlaced.q === bOriginal.q - aOriginal.q
          && bPlaced.r - aPlaced.r === bOriginal.r - aOriginal.r
          && coordinateDistance(aOriginal, bOriginal) === 1;
      };

      const drawComponentOutline = (component: Tile[]) => {
        const componentCoordinates = new Set(component.map((tile) => coordinateKey(slotCoordinate(tile.slot))));
        const style = { color: 0xffffff, width: gameConfig.pieces.outlineWidth, alpha: .98 };
        component.forEach((member) => {
          const outline = member.outline.clear();
          const current = slotCoordinate(member.slot);
          outlineDirections.forEach((direction, edge) => {
            if (direction) {
              const neighbor = { q: current.q + direction.q, r: current.r + direction.r };
              if (componentCoordinates.has(coordinateKey(neighbor))) return;
            }
            const pointIndex = edge * 2;
            const nextPointIndex = ((edge + 1) % outlineDirections.length) * 2;
            outline
              .moveTo(tilePoints[pointIndex], tilePoints[pointIndex + 1])
              .lineTo(tilePoints[nextPointIndex], tilePoints[nextPointIndex + 1])
              .stroke(style);
          });
        });
      };

      const recomputeConnections = (): number => {
        const links = new Map<Tile, Set<Tile>>(tiles.map((tile) => [tile, new Set<Tile>()]));
        for (let slot = 0; slot < occupancy.length; slot++) {
          const tile = occupancy[slot]!;
          const current = slotCoordinate(slot);
          forwardDirections.forEach((direction) => {
            const neighborSlot = coordinateToSlot({ q: current.q + direction.q, r: current.r + direction.r });
            if (neighborSlot === undefined) return;
            const neighbor = occupancy[neighborSlot]!;
            if (connectedNeighbors(tile, neighbor)) { links.get(tile)!.add(neighbor); links.get(neighbor)!.add(tile); }
          });
        }

        const visited = new Set<Tile>();
        let groupCount = 0;
        connectedGroups = new Map();
        for (const tile of tiles) {
          if (visited.has(tile)) continue;
          const stack = [tile];
          const component: Tile[] = [];
          visited.add(tile);
          while (stack.length) {
            const current = stack.pop()!;
            component.push(current);
            links.get(current)!.forEach((neighbor) => {
              if (!visited.has(neighbor)) { visited.add(neighbor); stack.push(neighbor); }
            });
          }
          component.forEach((member) => { member.group = groupCount; });
          connectedGroups.set(groupCount, component);
          drawComponentOutline(component);
          groupCount += 1;
        }
        won = tiles.every((tile) => tile.slot === tile.row * gridSize + tile.col);
        return groupCount;
      };

      const report = () => {
        const groups = recomputeConnections();
        if (startingGroups === 0) startingGroups = groups;
        onProgress({ moves, groups, won, startingGroups, moveLimit });
      };

      const slotDistance = (a: number, b: number) => coordinateDistance(slotCoordinate(a), slotCoordinate(b));

      const relocateGroup = (anchor: Tile, requestedSlot: number) => {
        const members = [...activeGroup];
        const memberSet = new Set(members);
        const anchorCoordinate = slotCoordinate(anchor.slot);
        const memberCoordinates = members.map((tile) => slotCoordinate(tile.slot));
        const candidateAnchorSlots = Array.from({ length: gridSize * gridSize }, (_, slot) => slot)
          .filter((candidateSlot) => {
            const candidate = slotCoordinate(candidateSlot);
            const delta = { q: candidate.q - anchorCoordinate.q, r: candidate.r - anchorCoordinate.r };
            return memberCoordinates.every((coordinate) => coordinateToSlot({ q: coordinate.q + delta.q, r: coordinate.r + delta.r }) !== undefined);
          })
          .sort((a, b) => slotDistance(a, requestedSlot) - slotDistance(b, requestedSlot));
        const targetAnchorCoordinate = slotCoordinate(candidateAnchorSlots[0] ?? anchor.slot);
        const delta = { q: targetAnchorCoordinate.q - anchorCoordinate.q, r: targetAnchorCoordinate.r - anchorCoordinate.r };
        if (delta.q === 0 && delta.r === 0) {
          members.forEach((tile) => moveToSlot(tile));
          return;
        }

        const oldOccupancy = [...occupancy];
        const originSlots = members.map((tile) => tile.slot);
        const targetSlots = memberCoordinates.map((coordinate) => coordinateToSlot({ q: coordinate.q + delta.q, r: coordinate.r + delta.r })!);
        const originSet = new Set(originSlots);
        const targetSet = new Set(targetSlots);
        const incomingSlots = targetSlots.filter((slot) => !originSet.has(slot));
        const vacatedSlots = originSlots.filter((slot) => !targetSet.has(slot));
        const displaced = incomingSlots.map((slot) => oldOccupancy[slot]!).filter((tile) => !memberSet.has(tile));

        new Set([...originSlots, ...incomingSlots]).forEach((slot) => { occupancy[slot] = undefined; });
        members.forEach((tile, index) => {
          tile.slot = targetSlots[index];
          occupancy[tile.slot] = tile;
          moveToSlot(tile);
        });

        const remainingVacancies = [...vacatedSlots];
        displaced.forEach((tile) => {
          let bestIndex = 0;
          for (let index = 1; index < remainingVacancies.length; index++) {
            if (slotDistance(tile.slot, remainingVacancies[index]) < slotDistance(tile.slot, remainingVacancies[bestIndex])) bestIndex = index;
          }
          tile.slot = remainingVacancies.splice(bestIndex, 1)[0];
          occupancy[tile.slot] = tile;
          moveToSlot(tile);
        });
        moves += 1;
        report();
      };

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const index = row * gridSize + col;
          const view = new Container();
          const sprite = tileShape === "hexagon"
            ? new Sprite(baseTexture)
            : new Sprite(new Texture({
              source: baseTexture.source,
              frame: new Rectangle(col * sourceCell, row * sourceCell, sourceCell, sourceCell),
            }));
          if (tileShape === "hexagon") {
            const originalPosition = slotPosition(index);
            sprite.width = hexImageSize;
            sprite.height = hexImageSize;
            sprite.position.set(hexImageX - originalPosition.x, hexImageY - originalPosition.y);
          } else {
            sprite.width = tileWidth;
            sprite.height = tileHeight;
          }
          sprite.roundPixels = true;
          const outline = new Graphics();
          if (tileShape !== "square") {
            const mask = new Graphics().poly(tilePoints).fill(0xffffff);
            sprite.mask = mask;
            view.addChild(sprite, mask, outline);
          } else {
            view.addChild(sprite, outline);
          }
          view.eventMode = "static";
          view.cursor = "grab";
          view.hitArea = tileShape === "square" ? new Rectangle(0, 0, tileWidth, tileHeight) : new Polygon(tilePoints);

          const tile: Tile = { row, col, group: index, slot: initialSlots[index], view, outline };
          tiles.push(tile);
          occupancy[tile.slot] = tile;
          moveToSlot(tile, false);

          view.on("pointerdown", (event: FederatedPointerEvent) => {
            if (won) return;
            if (!started) {
              started = true;
              onStart();
            }
            activeTile = tile;
            activeGroup = [...(connectedGroups.get(tile.group) ?? [tile])];
            dragStart = { x: event.global.x, y: event.global.y };
            dragOrigins = new Map();
            activeGroup.forEach((member) => {
              const oldTween = tweens.get(member);
              if (oldTween) { app?.ticker.remove(oldTween); tweens.delete(member); }
              dragOrigins.set(member, { x: member.view.x, y: member.view.y });
              member.view.cursor = "grabbing";
              app?.stage.addChild(member.view);
            });
          });
          app.stage.addChild(view);
        }
      }

      const release = () => {
        if (!activeTile) return;
        activeGroup.forEach((tile) => { tile.view.cursor = "grab"; });
        const centerX = activeTile.view.x + tileWidth / 2;
        const centerY = activeTile.view.y + tileHeight / 2;
        let requestedSlot = 0;
        let closestDistance = Number.POSITIVE_INFINITY;
        for (let slot = 0; slot < occupancy.length; slot++) {
          const position = slotPosition(slot);
          const dx = centerX - position.x - tileWidth / 2;
          const dy = centerY - position.y - tileHeight / 2;
          const distance = dx * dx + dy * dy;
          if (distance < closestDistance) { closestDistance = distance; requestedSlot = slot; }
        }
        const releasedTile = activeTile;
        activeTile = null;
        relocateGroup(releasedTile, requestedSlot);
        activeGroup = [];
      };

      app.stage.eventMode = "static";
      app.stage.hitArea = new Rectangle(boardX, boardY, boardSize, boardSize);
      app.stage.on("pointermove", (event: FederatedPointerEvent) => {
        if (!activeTile) return;
        const rawDx = event.global.x - dragStart.x;
        const rawDy = event.global.y - dragStart.y;
        const origins = [...dragOrigins.values()];
        const minX = Math.min(...origins.map((position) => position.x));
        const minY = Math.min(...origins.map((position) => position.y));
        const maxX = Math.max(...origins.map((position) => position.x + tileWidth));
        const maxY = Math.max(...origins.map((position) => position.y + tileHeight));
        const dx = Math.max(startX - minX, Math.min(startX + gridWidth - maxX, rawDx));
        const dy = Math.max(startY - minY, Math.min(startY + gridHeight - maxY, rawDy));
        activeGroup.forEach((tile) => {
          const origin = dragOrigins.get(tile)!;
          tile.view.position.set(origin.x + dx, origin.y + dy);
        });
      });
      app.stage.on("pointerup", release);
      app.stage.on("pointerupoutside", release);
      report();
    };

    void start().catch((error) => {
      if (host && !disposed) host.innerHTML = `<p class="loading">${error instanceof Error ? error.message : "Unable to start puzzle."}</p>`;
    });

    return () => {
      disposed = true;
      if (app) {
        app.destroy(true, { children: true, texture: true });
        app = null;
      }
      host.replaceChildren();
    };
}

export class PuzzleBoard {
  private readonly cleanup: () => void;

  constructor(host: HTMLDivElement, options: PuzzleBoardOptions) {
    this.cleanup = mountPuzzleBoard(host, options);
  }

  destroy(): void {
    this.cleanup();
  }
}
