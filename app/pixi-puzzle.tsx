"use client";

import { useEffect, useRef } from "react";
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Texture, Ticker } from "pixi.js";

const BOARD_MARGIN = 12;
const TILE_GAP = 0;
const MOVE_DURATION = 170;
const TILE_TEXTURE_SIZE = 256;

export type GridSize = 4 | 6 | 8;

type Progress = { moves: number; groups: number; won: boolean };
type Tile = {
  row: number;
  col: number;
  group: number;
  slot: number;
  view: Container;
  outline: Graphics;
};

type Props = {
  imageUrl: string;
  gridSize: GridSize;
  onProgress: (progress: Progress) => void;
};

function shuffledSlots(gridSize: GridSize): number[] {
  const result = Array.from({ length: gridSize * gridSize }, (_, index) => index);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.every((slot, index) => slot === index)) result.push(result.shift()!);
  return result;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The puzzle image could not be loaded."));
    image.src = src;
  });
}

function normalizeImage(image: HTMLImageElement, textureSize: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = textureSize;
  canvas.height = textureSize;
  const context = canvas.getContext("2d")!;
  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const cropX = (image.naturalWidth - cropSize) / 2;
  const cropY = (image.naturalHeight - cropSize) / 2;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, cropX, cropY, cropSize, cropSize, 0, 0, textureSize, textureSize);
  return canvas;
}

export function PixiPuzzle({ imageUrl, gridSize, onProgress }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
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
      const cell = Math.floor(availableSize / gridSize);
      const boardSize = cell * gridSize;
      const startX = Math.round((width - boardSize) / 2);
      const startY = Math.round((height - boardSize) / 2);
      const initialSlots = shuffledSlots(gridSize);

      const board = new Graphics()
        .roundRect(startX - 4, startY - 4, boardSize + 8, boardSize + 8, 18)
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

      const slotPosition = (slot: number) => ({
        x: startX + (slot % gridSize) * (cell + TILE_GAP),
        y: startY + Math.floor(slot / gridSize) * (cell + TILE_GAP),
      });

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
        const aSlotRow = Math.floor(a.slot / gridSize);
        const aSlotCol = a.slot % gridSize;
        const bSlotRow = Math.floor(b.slot / gridSize);
        const bSlotCol = b.slot % gridSize;
        return bSlotRow - aSlotRow === b.row - a.row
          && bSlotCol - aSlotCol === b.col - a.col
          && Math.abs(b.row - a.row) + Math.abs(b.col - a.col) === 1;
      };

      const drawComponentOutline = (component: Tile[]) => {
        const componentSlots = new Set(component.map((tile) => tile.slot));
        const style = { color: 0xffffff, width: 3, alpha: .98 };
        component.forEach((member) => {
          const slotRow = Math.floor(member.slot / gridSize);
          const slotCol = member.slot % gridSize;
          const outline = member.outline.clear();
          if (component.length === 1) {
            outline.rect(1.5, 1.5, cell - 3, cell - 3).stroke(style);
            return;
          }
          if (slotRow === 0 || !componentSlots.has(member.slot - gridSize)) outline.moveTo(1, 1).lineTo(cell - 1, 1).stroke(style);
          if (slotCol === gridSize - 1 || !componentSlots.has(member.slot + 1)) outline.moveTo(cell - 1, 1).lineTo(cell - 1, cell - 1).stroke(style);
          if (slotRow === gridSize - 1 || !componentSlots.has(member.slot + gridSize)) outline.moveTo(cell - 1, cell - 1).lineTo(1, cell - 1).stroke(style);
          if (slotCol === 0 || !componentSlots.has(member.slot - 1)) outline.moveTo(1, cell - 1).lineTo(1, 1).stroke(style);
        });
      };

      const recomputeConnections = (): number => {
        const links = new Map<Tile, Set<Tile>>(tiles.map((tile) => [tile, new Set<Tile>()]));
        for (let slot = 0; slot < occupancy.length; slot++) {
          const tile = occupancy[slot]!;
          const slotRow = Math.floor(slot / gridSize);
          const slotCol = slot % gridSize;
          if (slotCol < gridSize - 1) {
            const right = occupancy[slot + 1]!;
            if (connectedNeighbors(tile, right)) { links.get(tile)!.add(right); links.get(right)!.add(tile); }
          }
          if (slotRow < gridSize - 1) {
            const below = occupancy[slot + gridSize]!;
            if (connectedNeighbors(tile, below)) { links.get(tile)!.add(below); links.get(below)!.add(tile); }
          }
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

      const report = () => onProgress({ moves, groups: recomputeConnections(), won });

      const slotDistance = (a: number, b: number) => Math.abs(Math.floor(a / gridSize) - Math.floor(b / gridSize)) + Math.abs((a % gridSize) - (b % gridSize));

      const relocateGroup = (anchor: Tile, requestedSlot: number) => {
        const members = [...activeGroup];
        const memberSet = new Set(members);
        const anchorRow = Math.floor(anchor.slot / gridSize);
        const anchorCol = anchor.slot % gridSize;
        const requestedRow = Math.floor(requestedSlot / gridSize);
        const requestedCol = requestedSlot % gridSize;
        const rows = members.map((tile) => Math.floor(tile.slot / gridSize));
        const cols = members.map((tile) => tile.slot % gridSize);
        const deltaRow = Math.max(-Math.min(...rows), Math.min(gridSize - 1 - Math.max(...rows), requestedRow - anchorRow));
        const deltaCol = Math.max(-Math.min(...cols), Math.min(gridSize - 1 - Math.max(...cols), requestedCol - anchorCol));
        if (deltaRow === 0 && deltaCol === 0) {
          members.forEach((tile) => moveToSlot(tile));
          return;
        }

        const oldOccupancy = [...occupancy];
        const originSlots = members.map((tile) => tile.slot);
        const targetSlots = members.map((tile) => tile.slot + deltaRow * gridSize + deltaCol);
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
          const tileTexture = new Texture({
            source: baseTexture.source,
            frame: new Rectangle(col * sourceCell, row * sourceCell, sourceCell, sourceCell),
          });
          const view = new Container();
          const sprite = new Sprite(tileTexture);
          sprite.width = cell;
          sprite.height = cell;
          sprite.roundPixels = true;
          const outline = new Graphics();
          view.addChild(sprite, outline);
          view.eventMode = "static";
          view.cursor = "grab";
          view.hitArea = new Rectangle(0, 0, cell, cell);

          const tile: Tile = { row, col, group: index, slot: initialSlots[index], view, outline };
          tiles.push(tile);
          occupancy[tile.slot] = tile;
          moveToSlot(tile, false);

          view.on("pointerdown", (event: FederatedPointerEvent) => {
            if (won) return;
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
        const centerX = activeTile.view.x + cell / 2;
        const centerY = activeTile.view.y + cell / 2;
        const col = Math.max(0, Math.min(gridSize - 1, Math.round((centerX - startX - cell / 2) / (cell + TILE_GAP))));
        const row = Math.max(0, Math.min(gridSize - 1, Math.round((centerY - startY - cell / 2) / (cell + TILE_GAP))));
        const releasedTile = activeTile;
        activeTile = null;
        relocateGroup(releasedTile, row * gridSize + col);
        activeGroup = [];
      };

      app.stage.eventMode = "static";
      app.stage.hitArea = new Rectangle(startX, startY, boardSize, boardSize);
      app.stage.on("pointermove", (event: FederatedPointerEvent) => {
        if (!activeTile) return;
        const rawDx = event.global.x - dragStart.x;
        const rawDy = event.global.y - dragStart.y;
        const origins = [...dragOrigins.values()];
        const minX = Math.min(...origins.map((position) => position.x));
        const minY = Math.min(...origins.map((position) => position.y));
        const maxX = Math.max(...origins.map((position) => position.x + cell));
        const maxY = Math.max(...origins.map((position) => position.y + cell));
        const dx = Math.max(startX - minX, Math.min(startX + boardSize - maxX, rawDx));
        const dy = Math.max(startY - minY, Math.min(startY + boardSize - maxY, rawDy));
        activeGroup.forEach((tile) => {
          const origin = dragOrigins.get(tile)!;
          tile.view.position.set(origin.x + dx, origin.y + dy);
        });
      });
      app.stage.on("pointerup", release);
      app.stage.on("pointerupoutside", release);
      report();
    };

    start().catch((error) => {
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
  }, [gridSize, imageUrl, onProgress]);

  return <div ref={hostRef} className="canvas-host" aria-label={`Interactive square ${gridSize} by ${gridSize} tile-swapping picture puzzle`} />;
}
