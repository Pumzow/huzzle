"use client";

import { useEffect, useRef } from "react";
import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Texture } from "pixi.js";

const GRID = 4;
const GAP = 10;
const SNAP_DISTANCE = 24;

type Progress = { moves: number; groups: number; won: boolean };
type Tile = {
  row: number;
  col: number;
  group: number;
  view: Container;
};

type Props = {
  imageUrl: string;
  onProgress: (progress: Progress) => void;
};

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
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
      const cell = Math.floor(Math.min((width - 54) / 4.55, (height - 54) / 4.55, 142));
      const boardWidth = cell * GRID + GAP * (GRID - 1);
      const boardHeight = boardWidth;
      const startX = (width - boardWidth) / 2;
      const startY = (height - boardHeight) / 2;
      const slots = shuffled(Array.from({ length: GRID * GRID }, (_, index) => ({
        x: startX + (index % GRID) * (cell + GAP),
        y: startY + Math.floor(index / GRID) * (cell + GAP),
      })));

      const tiles: Tile[] = [];
      const groups = new Map<number, Set<Tile>>();
      let activeGroup: number | null = null;
      let pointerStart = { x: 0, y: 0 };
      let positions = new Map<Tile, { x: number; y: number }>();
      let moves = 0;
      let won = false;

      const report = () => onProgress({ moves, groups: groups.size, won });

      const bringGroupForward = (groupId: number) => {
        groups.get(groupId)?.forEach((tile) => app?.stage.addChild(tile.view));
      };

      const mergeGroups = (keepId: number, mergeId: number) => {
        const keep = groups.get(keepId)!;
        const merge = groups.get(mergeId)!;
        merge.forEach((tile) => { tile.group = keepId; keep.add(tile); });
        groups.delete(mergeId);
      };

      const trySnap = (groupId: number): boolean => {
        const moving = groups.get(groupId);
        if (!moving) return false;
        let best: { movingTile: Tile; fixedTile: Tile; dx: number; dy: number; distance: number } | null = null;

        for (const movingTile of moving) {
          for (const fixedTile of tiles) {
            if (fixedTile.group === groupId) continue;
            const rowDelta = movingTile.row - fixedTile.row;
            const colDelta = movingTile.col - fixedTile.col;
            if (Math.abs(rowDelta) + Math.abs(colDelta) !== 1) continue;
            const targetX = fixedTile.view.x + colDelta * cell;
            const targetY = fixedTile.view.y + rowDelta * cell;
            const dx = targetX - movingTile.view.x;
            const dy = targetY - movingTile.view.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= SNAP_DISTANCE && (!best || distance < best.distance)) {
              best = { movingTile, fixedTile, dx, dy, distance };
            }
          }
        }

        if (!best) return false;
        moving.forEach((tile) => { tile.view.x += best!.dx; tile.view.y += best!.dy; });
        mergeGroups(groupId, best.fixedTile.group);
        return true;
      };

      const release = () => {
        if (activeGroup === null) return;
        moves += 1;
        while (trySnap(activeGroup)) { /* allow chain connections */ }
        bringGroupForward(activeGroup);
        activeGroup = null;
        won = groups.size === 1;
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
          const shadow = new Graphics().roundRect(4, 7, cell - 8, cell - 8, 12).fill({ color: 0x092e31, alpha: .28 });
          const sprite = new Sprite(tileTexture);
          sprite.width = cell;
          sprite.height = cell;
          const border = new Graphics().roundRect(1.5, 1.5, cell - 3, cell - 3, 11).stroke({ color: 0xfff8eb, width: 3, alpha: .92 });
          view.addChild(shadow, sprite, border);
          view.x = slots[index].x;
          view.y = slots[index].y;
          view.eventMode = "static";
          view.cursor = "grab";
          view.hitArea = new Rectangle(0, 0, cell, cell);

          const tile: Tile = { row, col, group: index, view };
          tiles.push(tile);
          groups.set(index, new Set([tile]));
          view.on("pointerdown", (event: FederatedPointerEvent) => {
            if (won) return;
            activeGroup = tile.group;
            pointerStart = { x: event.global.x, y: event.global.y };
            positions = new Map();
            groups.get(activeGroup)?.forEach((member) => positions.set(member, { x: member.view.x, y: member.view.y }));
            bringGroupForward(activeGroup);
            groups.get(activeGroup)?.forEach((member) => { member.view.cursor = "grabbing"; });
          });
          app.stage.addChild(view);
        }
      }

      app.stage.eventMode = "static";
      app.stage.hitArea = new Rectangle(0, 0, width, height);
      app.stage.on("pointermove", (event: FederatedPointerEvent) => {
        if (activeGroup === null) return;
        const dx = event.global.x - pointerStart.x;
        const dy = event.global.y - pointerStart.y;
        groups.get(activeGroup)?.forEach((tile) => {
          const origin = positions.get(tile)!;
          tile.view.x = Math.max(-cell * .45, Math.min(width - cell * .55, origin.x + dx));
          tile.view.y = Math.max(-cell * .45, Math.min(height - cell * .55, origin.y + dy));
        });
      });
      app.stage.on("pointerup", () => {
        if (activeGroup !== null) groups.get(activeGroup)?.forEach((tile) => { tile.view.cursor = "grab"; });
        release();
      });
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

  return <div ref={hostRef} className="canvas-host" aria-label="Interactive 4 by 4 picture puzzle" />;
}
