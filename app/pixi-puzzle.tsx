"use client";

import { useEffect, useRef } from "react";
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Texture, Ticker } from "pixi.js";

const GRID = 4;
const BOARD_MARGIN = 12;
const TILE_GAP = 5;
const MOVE_DURATION = 170;

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
  onProgress: (progress: Progress) => void;
};

function shuffledSlots(): number[] {
  const result = Array.from({ length: GRID * GRID }, (_, index) => index);
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

export function PixiPuzzle({ imageUrl, onProgress }: Props) {
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
        resolution: Math.min(window.devicePixelRatio || 1, 2),
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

      const baseTexture = Texture.from(image);
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - sourceSize) / 2;
      const sourceY = (image.naturalHeight - sourceSize) / 2;
      const sourceCell = sourceSize / GRID;
      const width = app.screen.width;
      const height = app.screen.height;
      const boardSize = Math.max(240, Math.min(width, height) - BOARD_MARGIN * 2);
      const cell = (boardSize - TILE_GAP * (GRID - 1)) / GRID;
      const startX = (width - boardSize) / 2;
      const startY = (height - boardSize) / 2;
      const initialSlots = shuffledSlots();

      const board = new Graphics()
        .roundRect(startX - 4, startY - 4, boardSize + 8, boardSize + 8, 18)
        .fill({ color: 0x123d3f, alpha: .82 })
        .stroke({ color: 0x8fbfb0, width: 1.5, alpha: .34 });
      app.stage.addChild(board);

      const tiles: Tile[] = [];
      const occupancy: Array<Tile | undefined> = Array(GRID * GRID);
      const tweens = new Map<Tile, (ticker: Ticker) => void>();
      let activeTile: Tile | null = null;
      let pointerOffset = { x: 0, y: 0 };
      let moves = 0;
      let won = false;

      const slotPosition = (slot: number) => ({
        x: startX + (slot % GRID) * (cell + TILE_GAP),
        y: startY + Math.floor(slot / GRID) * (cell + TILE_GAP),
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
        const aSlotRow = Math.floor(a.slot / GRID);
        const aSlotCol = a.slot % GRID;
        const bSlotRow = Math.floor(b.slot / GRID);
        const bSlotCol = b.slot % GRID;
        return bSlotRow - aSlotRow === b.row - a.row
          && bSlotCol - aSlotCol === b.col - a.col
          && Math.abs(b.row - a.row) + Math.abs(b.col - a.col) === 1;
      };

      const recomputeConnections = (): number => {
        const links = new Map<Tile, Set<Tile>>(tiles.map((tile) => [tile, new Set<Tile>()]));
        for (let slot = 0; slot < occupancy.length; slot++) {
          const tile = occupancy[slot]!;
          const slotRow = Math.floor(slot / GRID);
          const slotCol = slot % GRID;
          if (slotCol < GRID - 1) {
            const right = occupancy[slot + 1]!;
            if (connectedNeighbors(tile, right)) { links.get(tile)!.add(right); links.get(right)!.add(tile); }
          }
          if (slotRow < GRID - 1) {
            const below = occupancy[slot + GRID]!;
            if (connectedNeighbors(tile, below)) { links.get(tile)!.add(below); links.get(below)!.add(tile); }
          }
        }

        const visited = new Set<Tile>();
        let groupCount = 0;
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
          component.forEach((member) => {
            member.group = groupCount;
            member.outline.clear()
              .roundRect(1.5, 1.5, cell - 3, cell - 3, 9)
              .stroke({ color: component.length > 1 ? 0xbdebd6 : 0xfff8eb, width: component.length > 1 ? 4 : 2.5, alpha: .96 });
          });
          groupCount += 1;
        }
        won = tiles.every((tile) => tile.slot === tile.row * GRID + tile.col);
        return groupCount;
      };

      const report = () => onProgress({ moves, groups: recomputeConnections(), won });

      const swapTiles = (dragged: Tile, targetSlot: number) => {
        const originSlot = dragged.slot;
        const displaced = occupancy[targetSlot]!;
        if (originSlot === targetSlot) {
          moveToSlot(dragged);
          return;
        }
        occupancy[targetSlot] = dragged;
        occupancy[originSlot] = displaced;
        dragged.slot = targetSlot;
        displaced.slot = originSlot;
        moveToSlot(dragged);
        moveToSlot(displaced);
        moves += 1;
        report();
      };

      for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
          const index = row * GRID + col;
          const tileTexture = new Texture({
            source: baseTexture.source,
            frame: new Rectangle(sourceX + col * sourceCell, sourceY + row * sourceCell, sourceCell, sourceCell),
          });
          const view = new Container();
          const shadow = new Graphics().roundRect(3, 5, cell - 4, cell - 4, 10).fill({ color: 0x062c2f, alpha: .34 });
          const sprite = new Sprite(tileTexture);
          sprite.width = cell;
          sprite.height = cell;
          const outline = new Graphics();
          view.addChild(shadow, sprite, outline);
          view.eventMode = "static";
          view.cursor = "grab";
          view.hitArea = new Rectangle(0, 0, cell, cell);

          const tile: Tile = { row, col, group: index, slot: initialSlots[index], view, outline };
          tiles.push(tile);
          occupancy[tile.slot] = tile;
          moveToSlot(tile, false);

          view.on("pointerdown", (event: FederatedPointerEvent) => {
            if (won) return;
            const oldTween = tweens.get(tile);
            if (oldTween) { app?.ticker.remove(oldTween); tweens.delete(tile); }
            activeTile = tile;
            pointerOffset = { x: event.global.x - tile.view.x, y: event.global.y - tile.view.y };
            tile.view.cursor = "grabbing";
            app?.stage.addChild(tile.view);
          });
          app.stage.addChild(view);
        }
      }

      const release = () => {
        if (!activeTile) return;
        activeTile.view.cursor = "grab";
        const centerX = activeTile.view.x + cell / 2;
        const centerY = activeTile.view.y + cell / 2;
        const col = Math.max(0, Math.min(GRID - 1, Math.round((centerX - startX - cell / 2) / (cell + TILE_GAP))));
        const row = Math.max(0, Math.min(GRID - 1, Math.round((centerY - startY - cell / 2) / (cell + TILE_GAP))));
        const releasedTile = activeTile;
        activeTile = null;
        swapTiles(releasedTile, row * GRID + col);
      };

      app.stage.eventMode = "static";
      app.stage.hitArea = new Rectangle(startX, startY, boardSize, boardSize);
      app.stage.on("pointermove", (event: FederatedPointerEvent) => {
        if (!activeTile) return;
        activeTile.view.x = Math.max(startX, Math.min(startX + boardSize - cell, event.global.x - pointerOffset.x));
        activeTile.view.y = Math.max(startY, Math.min(startY + boardSize - cell, event.global.y - pointerOffset.y));
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
  }, [imageUrl, onProgress]);

  return <div ref={hostRef} className="canvas-host" aria-label="Interactive square 4 by 4 tile-swapping picture puzzle" />;
}
