import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Polygon,
  Rectangle,
  Sprite,
  Texture,
} from "pixi.js";
import { gameConfig } from "../../config/gameConfig";
import { loadImage, normalizeImage } from "../../systems/imageProcessor";
import {
  canStartGroupDrag,
  canUseTargetSlot,
  minimumSwapsToSolve,
  moveLimitFor,
  shuffledSlots,
} from "../../systems/puzzleLogic";
import { PuzzleBoardOptions } from "../../types/gameTypes";
import { createPuzzleBoardGeometry } from "./puzzleBoardGeometry";
import { PuzzleBoardEffects } from "./puzzleBoardEffects";
import { PuzzleBoardConnections } from "./puzzleBoardConnections";
import type {
  ActivePuzzleDrag,
  PuzzleTile,
} from "./puzzleBoardTypes";

const TILE_TEXTURE_SIZE = gameConfig.pieces.textureSize;

function mountPuzzleBoard(
  host: HTMLDivElement,
  options: PuzzleBoardOptions
): () => void {
  const {
    imageUrl,
    gridSize,
    tileShape,
    scoring,
    random = Math.random,
    onProgress,
    onStart,
    onReady,
  } = options;
  let disposed = false;
  let app: Application | null = null;
  let effects: PuzzleBoardEffects | null = null;

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

    const isCard = tileShape === "card";
    const cardConfig = gameConfig.pieces.shapes.find(
      ({ value }) => value === "card"
    );
    if (!cardConfig || !("aspectRatio" in cardConfig))
      throw new Error("Missing card aspect-ratio configuration.");
    const cardAspectRatio = cardConfig.aspectRatio;
    const textureHeight = gridSize * TILE_TEXTURE_SIZE;
    const textureWidth = isCard
      ? Math.round(textureHeight * cardAspectRatio)
      : textureHeight;
    const normalizedImage = normalizeImage(image, textureWidth, textureHeight);
    const baseTexture = Texture.from(normalizedImage);
    const sourceCellWidth = textureWidth / gridSize;
    const sourceCellHeight = textureHeight / gridSize;
    const width = app.screen.width;
    const height = app.screen.height;
    const geometry = createPuzzleBoardGeometry({
      width,
      height,
      gridSize,
      tileShape,
      cardAspectRatio,
    });
    const {
      isHexagon,
      isRectangle,
      tileWidth,
      tileHeight,
      gridWidth,
      gridHeight,
      boardWidth,
      boardHeight,
      boardX,
      boardY,
      startX,
      startY,
      hexImageSize,
      hexImageX,
      hexImageY,
      tilePoints,
      slotCoordinate,
      coordinateToSlot,
      coordinateDistance,
      slotPosition,
    } = geometry;
    const initialState = options.initialState;
    const initialSlots = initialState
      ? [...initialState.slots]
      : shuffledSlots(gridSize, random);

    const board = new Graphics()
      .roundRect(boardX, boardY, boardWidth, boardHeight, 18)
      .fill({ color: 0x123d3f, alpha: 0.82 })
      .stroke({ color: 0x8fbfb0, width: 1.5, alpha: 0.34 });
    const tileLayer = new Container();
    const dragLayer = new Container();
    const dragOutlineLayer = new Container();
    const connectionEffectLayer = new Container();
    dragOutlineLayer.eventMode = "none";
    connectionEffectLayer.eventMode = "none";
    app.stage.addChild(
      board,
      tileLayer,
      connectionEffectLayer,
      dragLayer,
      dragOutlineLayer
    );

    effects = new PuzzleBoardEffects(geometry, dragOutlineLayer);
    const boardEffects = effects;
    const tiles: PuzzleTile[] = [];
    const occupancy: Array<PuzzleTile | undefined> = Array(gridSize * gridSize);
    const connections = new PuzzleBoardConnections(
      tiles,
      occupancy,
      gridSize,
      geometry,
      boardEffects,
    );
    const activeDrags = new Map<number, ActivePuzzleDrag>();
    const settlingTiles = new Set<PuzzleTile>();
    let moves = initialState?.moves ?? 0;
    let won = false;
    let started = initialState?.started ?? false;
    let startingGroups = initialState?.startingGroups ?? 0;
    const requiredMoves = minimumSwapsToSolve(initialSlots);
    const moveLimit =
      initialState?.moveLimit ??
      moveLimitFor(
        requiredMoves,
        scoring.minimumFreeMoves,
        scoring.moveAllowanceMultiplier
      );
    const report = () => {
      const result = connections.recompute(activeDrags.size === 0);
      const groups = result.groups;
      won = result.won;
      if (startingGroups === 0) startingGroups = groups;
      onProgress({
        slots: tiles.map((tile) => tile.slot),
        moves,
        groups,
        won,
        startingGroups,
        moveLimit,
      });
      connections.markReported();
    };

    const slotDistance = (a: number, b: number) =>
      coordinateDistance(slotCoordinate(a), slotCoordinate(b));

    const relocateGroup = (
      anchor: PuzzleTile,
      members: PuzzleTile[],
      requestedSlot: number,
      onMemberSettled?: (tile: PuzzleTile) => void
    ) => {
      const memberSet = new Set(members);
      const lockedTiles = new Set(
        [...activeDrags.values()].flatMap((drag) => drag.members)
      );
      const anchorCoordinate = slotCoordinate(anchor.slot);
      const memberCoordinates = members.map((tile) =>
        slotCoordinate(tile.slot)
      );
      const candidateAnchorSlots = Array.from(
        { length: gridSize * gridSize },
        (_, slot) => slot
      )
        .filter((candidateSlot) => {
          const candidate = slotCoordinate(candidateSlot);
          const delta = {
            q: candidate.q - anchorCoordinate.q,
            r: candidate.r - anchorCoordinate.r,
          };
          return memberCoordinates.every((coordinate) => {
            const targetSlot = coordinateToSlot({
              q: coordinate.q + delta.q,
              r: coordinate.r + delta.r,
            });
            if (targetSlot === undefined) return false;
            const occupant = occupancy[targetSlot];
            return canUseTargetSlot(occupant, memberSet, lockedTiles);
          });
        })
        .sort(
          (a, b) =>
            slotDistance(a, requestedSlot) - slotDistance(b, requestedSlot)
        );
      const targetAnchorCoordinate = slotCoordinate(
        candidateAnchorSlots[0] ?? anchor.slot
      );
      const delta = {
        q: targetAnchorCoordinate.q - anchorCoordinate.q,
        r: targetAnchorCoordinate.r - anchorCoordinate.r,
      };
      if (delta.q === 0 && delta.r === 0) {
        members.forEach((tile) => settlingTiles.add(tile));
        boardEffects.moveTilesToSlots(members, true, (tile) => {
          settlingTiles.delete(tile);
          onMemberSettled?.(tile);
        });
        return;
      }

      const oldOccupancy = [...occupancy];
      const originSlots = members.map((tile) => tile.slot);
      const targetSlots = memberCoordinates.map(
        (coordinate) =>
          coordinateToSlot({
            q: coordinate.q + delta.q,
            r: coordinate.r + delta.r,
          })!
      );
      const originSet = new Set(originSlots);
      const targetSet = new Set(targetSlots);
      const incomingSlots = targetSlots.filter((slot) => !originSet.has(slot));
      const vacatedSlots = originSlots.filter((slot) => !targetSet.has(slot));
      const displaced = incomingSlots
        .map((slot) => oldOccupancy[slot]!)
        .filter((tile) => !memberSet.has(tile));
      boardEffects.stopConnectionPulsesFor(displaced);

      new Set([...originSlots, ...incomingSlots]).forEach((slot) => {
        occupancy[slot] = undefined;
      });
      members.forEach((tile, index) => {
        tile.slot = targetSlots[index];
        occupancy[tile.slot] = tile;
      });

      const remainingVacancies = [...vacatedSlots];
      displaced.forEach((tile) => {
        let bestIndex = 0;
        for (let index = 1; index < remainingVacancies.length; index++) {
          if (
            slotDistance(tile.slot, remainingVacancies[index]) <
            slotDistance(tile.slot, remainingVacancies[bestIndex])
          )
            bestIndex = index;
        }
        tile.slot = remainingVacancies.splice(bestIndex, 1)[0];
        occupancy[tile.slot] = tile;
      });

      moves += 1;
      let tilesAwaitingLanding = members.length + displaced.length;
      [...members, ...displaced].forEach((tile) => settlingTiles.add(tile));
      const reportAfterLanding = (tile: PuzzleTile) => {
        settlingTiles.delete(tile);
        tilesAwaitingLanding -= 1;
        if (tilesAwaitingLanding === 0) report();
      };
      boardEffects.moveTilesToSlots(members, true, (tile) => {
        onMemberSettled?.(tile);
        reportAfterLanding(tile);
      });
      displaced.forEach((tile) =>
        boardEffects.moveToSlot(tile, true, () => reportAfterLanding(tile))
      );
    };

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const index = row * gridSize + col;
        const view = new Container();
        const sprite = isHexagon
          ? new Sprite(baseTexture)
          : new Sprite(
              new Texture({
                source: baseTexture.source,
                frame: new Rectangle(
                  col * sourceCellWidth,
                  row * sourceCellHeight,
                  sourceCellWidth,
                  sourceCellHeight
                ),
              })
            );
        if (isHexagon) {
          const originalPosition = slotPosition(index);
          sprite.width = hexImageSize;
          sprite.height = hexImageSize;
          sprite.position.set(
            hexImageX - originalPosition.x,
            hexImageY - originalPosition.y
          );
        } else {
          sprite.width = tileWidth;
          sprite.height = tileHeight;
        }
        sprite.roundPixels = true;
        const outline = new Graphics();
        const connectionOutline = new Graphics();
        connectionOutline.visible = false;
        if (!isRectangle) {
          const mask = new Graphics().poly(tilePoints).fill(0xffffff);
          sprite.mask = mask;
          view.addChild(sprite, mask);
        } else {
          view.addChild(sprite);
        }
        outline.eventMode = "none";
        view.addChild(outline);
        view.eventMode = "static";
        view.cursor = "grab";
        view.hitArea = isRectangle
          ? new Rectangle(0, 0, tileWidth, tileHeight)
          : new Polygon(tilePoints);

        const tile: PuzzleTile = {
          row,
          col,
          group: index,
          slot: initialSlots[index],
          view,
          outline,
          connectionOutline,
        };
        tiles.push(tile);
        occupancy[tile.slot] = tile;
        tileLayer.addChild(view);
        connectionEffectLayer.addChild(connectionOutline);
        boardEffects.moveToSlot(tile, false);

        view.on("pointerdown", (event: FederatedPointerEvent) => {
          if (won || settlingTiles.has(tile)) return;
          const members = connections.membersFor(tile);
          if (
            activeDrags.has(event.pointerId) ||
            members.some((member) => settlingTiles.has(member)) ||
            !canStartGroupDrag(
              members,
              [...activeDrags.values()].map((drag) => drag.members)
            )
          )
            return;
          boardEffects.stopConnectionPulsesFor(members);
          if (!started) {
            started = true;
            onStart();
          }
          const origins = new Map<PuzzleTile, { x: number; y: number }>();
          activeDrags.set(event.pointerId, {
            anchor: tile,
            members,
            start: { x: event.global.x, y: event.global.y },
            origins,
          });
          members.forEach((member) => {
            boardEffects.stopTileMotion(member);
            origins.set(member, { x: member.view.x, y: member.view.y });
            member.view.cursor = "grabbing";
            dragLayer.addChild(member.view);
            boardEffects.moveOutlineToDragLayer(member);
          });
        });
      }
    }

    const release = (event: FederatedPointerEvent) => {
      const drag = activeDrags.get(event.pointerId);
      if (!drag) return;
      activeDrags.delete(event.pointerId);
      drag.members.forEach((tile) => {
        tile.view.cursor = "grab";
      });
      const centerX = drag.anchor.view.x + tileWidth / 2;
      const centerY = drag.anchor.view.y + tileHeight / 2;
      let requestedSlot = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (let slot = 0; slot < occupancy.length; slot++) {
        const position = slotPosition(slot);
        const dx = centerX - position.x - tileWidth / 2;
        const dy = centerY - position.y - tileHeight / 2;
        const distance = dx * dx + dy * dy;
        if (distance < closestDistance) {
          closestDistance = distance;
          requestedSlot = slot;
        }
      }
      relocateGroup(drag.anchor, drag.members, requestedSlot, (tile) => {
        boardEffects.attachOutlineToTile(tile);
        tileLayer.addChild(tile.view);
      });
    };

    app.stage.eventMode = "static";
    app.stage.hitArea = new Rectangle(boardX, boardY, boardWidth, boardHeight);
    app.stage.on("pointermove", (event: FederatedPointerEvent) => {
      const drag = activeDrags.get(event.pointerId);
      if (!drag) return;
      const rawDx = event.global.x - drag.start.x;
      const rawDy = event.global.y - drag.start.y;
      const origins = [...drag.origins.values()];
      const minX = Math.min(...origins.map((position) => position.x));
      const minY = Math.min(...origins.map((position) => position.y));
      const maxX = Math.max(
        ...origins.map((position) => position.x + tileWidth)
      );
      const maxY = Math.max(
        ...origins.map((position) => position.y + tileHeight)
      );
      const dx = Math.max(
        startX - minX,
        Math.min(startX + gridWidth - maxX, rawDx)
      );
      const dy = Math.max(
        startY - minY,
        Math.min(startY + gridHeight - maxY, rawDy)
      );
      drag.members.forEach((tile) => {
        const origin = drag.origins.get(tile)!;
        boardEffects.setTileTransform(tile, origin.x + dx, origin.y + dy);
      });
    });
    app.stage.on("pointerup", release);
    app.stage.on("pointerupoutside", release);
    app.stage.on("pointercancel", release);
    report();
    app.renderer.render(app.stage);
    onReady?.();
  };

  void start().catch((error) => {
    if (host && !disposed) {
      host.innerHTML = `<p class="loading">${
        error instanceof Error ? error.message : "Unable to start puzzle."
      }</p>`;
      onReady?.();
    }
  });

  return () => {
    disposed = true;
    effects?.destroy();
    effects = null;
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
