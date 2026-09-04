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
import { gsap } from "gsap";
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

const BOARD_MARGIN = gameConfig.board.margin;
const TILE_GAP = gameConfig.pieces.gap;
const TILE_SETTLE_EFFECT = gameConfig.visualEffects.tileSettle;
const CONNECTION_EFFECT = gameConfig.visualEffects.connection;
const TILE_TEXTURE_SIZE = gameConfig.pieces.textureSize;
type Tile = {
  row: number;
  col: number;
  group: number;
  slot: number;
  view: Container;
  outline: Graphics;
  connectionOutline: Graphics;
};

type GridCoordinate = { q: number; r: number };
type ActiveDrag = {
  anchor: Tile;
  members: Tile[];
  start: { x: number; y: number };
  origins: Map<Tile, { x: number; y: number }>;
};

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
  const activeTweens = new Set<gsap.core.Tween>();

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
    const availableWidth = Math.max(180, width - BOARD_MARGIN * 2);
    const availableHeight = Math.max(180, height - BOARD_MARGIN * 2);
    const isFlatHexagon = tileShape === "hexagon";
    const isVerticalHexagon = tileShape === "verticalHexagon";
    const isHexagon = isFlatHexagon || isVerticalHexagon;
    const isRectangle = tileShape === "square" || isCard;
    const hexWidthFactor = 0.75 * gridSize + 0.25;
    const hexHeightFactor = (Math.sqrt(3) / 2) * (gridSize + 0.5);
    const verticalHexWidthFactor = (Math.sqrt(3) / 2) * (gridSize + 0.5);
    const verticalHexHeightFactor = 0.75 * gridSize + 0.25;
    const flatHexTileWidth = Math.max(
      24,
      Math.min(
        availableWidth / hexWidthFactor,
        availableHeight / hexHeightFactor
      )
    );
    const verticalHexTileHeight = Math.max(
      24,
      Math.min(
        availableWidth / verticalHexWidthFactor,
        availableHeight / verticalHexHeightFactor
      )
    );
    const cardTileWidth = Math.max(
      18,
      Math.floor(
        Math.min(
          availableWidth / gridSize,
          (availableHeight * cardAspectRatio) / gridSize
        )
      )
    );
    const tileWidth = isCard
      ? cardTileWidth
      : isFlatHexagon
      ? flatHexTileWidth
      : isVerticalHexagon
      ? Math.round((verticalHexTileHeight * Math.sqrt(3)) / 2)
      : Math.floor(Math.min(availableWidth, availableHeight) / gridSize);
    const tileHeight = isCard
      ? Math.round(tileWidth / cardAspectRatio)
      : isFlatHexagon
      ? Math.round((tileWidth * Math.sqrt(3)) / 2)
      : isVerticalHexagon
      ? verticalHexTileHeight
      : tileWidth;
    const horizontalStep = isFlatHexagon ? tileWidth * 0.75 : tileWidth;
    const verticalStep = isVerticalHexagon ? tileHeight * 0.75 : tileHeight;
    const gridWidth = isCard
      ? tileWidth * gridSize
      : isFlatHexagon
      ? tileWidth + horizontalStep * (gridSize - 1)
      : isVerticalHexagon
      ? tileWidth * (gridSize + 0.5)
      : tileWidth * gridSize;
    const gridHeight = isCard
      ? tileHeight * gridSize
      : isFlatHexagon
      ? tileHeight * (gridSize + 0.5)
      : isVerticalHexagon
      ? tileHeight + verticalStep * (gridSize - 1)
      : tileHeight * gridSize;
    const boardWidth = gridWidth;
    const boardHeight = gridHeight;
    const boardX = Math.round((width - boardWidth) / 2);
    const boardY = Math.round((height - boardHeight) / 2);
    const startX = Math.round((width - gridWidth) / 2);
    const startY = Math.round((height - gridHeight) / 2);
    const hexImageSize = Math.max(gridWidth, gridHeight);
    const hexImageX = startX + (gridWidth - hexImageSize) / 2;
    const hexImageY = startY + (gridHeight - hexImageSize) / 2;
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

    const tiles: Tile[] = [];
    const occupancy: Array<Tile | undefined> = Array(gridSize * gridSize);
    const tweens = new Map<Tile, gsap.core.Tween>();
    const connectionTweens = new Map<Tile, gsap.core.Tween>();
    const connectionPulseGroups = new Map<Tile, Set<Tile>>();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let connectedGroups = new Map<number, Tile[]>();
    let connectedPairs = new Set<string>();
    let hasReported = false;
    const activeDrags = new Map<number, ActiveDrag>();
    const settlingTiles = new Set<Tile>();
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

    const coordinateFor = (row: number, col: number): GridCoordinate =>
      isFlatHexagon
        ? { q: col, r: row - Math.floor(col / 2) }
        : isVerticalHexagon
        ? { q: col - Math.floor(row / 2), r: row }
        : { q: col, r: row };

    const slotCoordinate = (slot: number) =>
      coordinateFor(Math.floor(slot / gridSize), slot % gridSize);

    const coordinateKey = ({ q, r }: GridCoordinate) => `${q}:${r}`;

    const coordinateToSlot = ({ q, r }: GridCoordinate): number | undefined => {
      const col = q;
      const row = isFlatHexagon ? r + Math.floor(q / 2) : r;
      const resolvedCol = isVerticalHexagon ? q + Math.floor(r / 2) : col;
      if (
        !Number.isInteger(row) ||
        !Number.isInteger(resolvedCol) ||
        row < 0 ||
        row >= gridSize ||
        resolvedCol < 0 ||
        resolvedCol >= gridSize
      )
        return undefined;
      return row * gridSize + resolvedCol;
    };

    const directions: GridCoordinate[] = isHexagon
      ? [
          { q: 0, r: -1 },
          { q: 1, r: -1 },
          { q: 1, r: 0 },
          { q: 0, r: 1 },
          { q: -1, r: 1 },
          { q: -1, r: 0 },
        ]
      : [
          { q: 0, r: -1 },
          { q: 1, r: 0 },
          { q: 0, r: 1 },
          { q: -1, r: 0 },
        ];

    const forwardDirections = isHexagon
      ? directions.slice(1, 4)
      : directions.slice(1, 3);

    const coordinateDistance = (a: GridCoordinate, b: GridCoordinate) => {
      const dq = a.q - b.q;
      const dr = a.r - b.r;
      return isHexagon
        ? (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
        : Math.abs(dq) + Math.abs(dr);
    };

    const slotPosition = (slot: number) => {
      const row = Math.floor(slot / gridSize);
      const col = slot % gridSize;
      return {
        x:
          startX +
          col * (horizontalStep + TILE_GAP) +
          (isVerticalHexagon && row % 2 ? tileWidth / 2 : 0),
        y:
          startY +
          row * (verticalStep + TILE_GAP) +
          (isFlatHexagon && col % 2 ? tileHeight / 2 : 0),
      };
    };

    const octagonCut = tileWidth * (1 - Math.SQRT1_2);
    const tilePoints = isFlatHexagon
      ? [
          tileWidth * 0.25,
          0,
          tileWidth * 0.75,
          0,
          tileWidth,
          tileHeight / 2,
          tileWidth * 0.75,
          tileHeight,
          tileWidth * 0.25,
          tileHeight,
          0,
          tileHeight / 2,
        ]
      : isVerticalHexagon
      ? [
          tileWidth / 2,
          0,
          tileWidth,
          tileHeight * 0.25,
          tileWidth,
          tileHeight * 0.75,
          tileWidth / 2,
          tileHeight,
          0,
          tileHeight * 0.75,
          0,
          tileHeight * 0.25,
        ]
      : tileShape === "octagon"
      ? [
          octagonCut,
          0,
          tileWidth - octagonCut,
          0,
          tileWidth,
          octagonCut,
          tileWidth,
          tileHeight - octagonCut,
          tileWidth - octagonCut,
          tileHeight,
          octagonCut,
          tileHeight,
          0,
          tileHeight - octagonCut,
          0,
          octagonCut,
        ]
      : [0, 0, tileWidth, 0, tileWidth, tileHeight, 0, tileHeight];
    const outlineDirections: Array<GridCoordinate | null> =
      tileShape === "octagon"
        ? [
            directions[0],
            null,
            directions[1],
            null,
            directions[2],
            null,
            directions[3],
            null,
          ]
        : isVerticalHexagon
        ? [...directions.slice(1), directions[0]]
        : directions;

    const setTileTransform = (tile: Tile, x: number, y: number, scale = 1) => {
      tile.view.position.set(x, y);
      tile.view.scale.set(scale);
      if (tile.outline.parent !== tile.view) {
        tile.outline.position.set(x, y);
        tile.outline.scale.set(scale);
      }
      tile.connectionOutline.position.set(x, y);
      tile.connectionOutline.scale.set(scale);
    };

    const moveOutlineToDragLayer = (tile: Tile) => {
      tile.outline.position.copyFrom(tile.view.position);
      tile.outline.scale.copyFrom(tile.view.scale);
      dragOutlineLayer.addChild(tile.outline);
    };

    const attachOutlineToTile = (tile: Tile) => {
      tile.outline.position.set(0, 0);
      tile.outline.scale.set(1);
      tile.view.addChild(tile.outline);
    };

    const moveTilesToSlots = (
      members: Tile[],
      animate = true,
      onMemberSettled?: (tile: Tile) => void
    ) => {
      const states = members.map((tile) => {
        const oldTween = tweens.get(tile);
        if (oldTween) {
          oldTween.kill();
          activeTweens.delete(oldTween);
          tweens.delete(tile);
        }
        const currentScale = tile.view.scale.x;
        const from = {
          x: tile.view.x + (tileWidth * (currentScale - 1)) / 2,
          y: tile.view.y + (tileHeight * (currentScale - 1)) / 2,
        };
        setTileTransform(tile, from.x, from.y);
        return { tile, from, target: slotPosition(tile.slot) };
      });
      if (!animate || reduceMotion) {
        states.forEach(({ tile, target }) => {
          setTileTransform(tile, target.x, target.y);
          onMemberSettled?.(tile);
        });
        return;
      }

      const centerFor = (positions: Array<{ x: number; y: number }>) => ({
        x:
          (Math.min(...positions.map(({ x }) => x)) +
            Math.max(...positions.map(({ x }) => x + tileWidth))) /
          2,
        y:
          (Math.min(...positions.map(({ y }) => y)) +
            Math.max(...positions.map(({ y }) => y + tileHeight))) /
          2,
      });
      const fromCenter = centerFor(states.map(({ from }) => from));
      const targetCenter = centerFor(states.map(({ target }) => target));
      const motion = { progress: 0 };
      const tween = gsap.to(motion, {
        duration: TILE_SETTLE_EFFECT.duration,
        ease: "none",
        progress: 1,
        onUpdate: () => {
          const raw = motion.progress;
          const eased = 1 - Math.pow(1 - raw, TILE_SETTLE_EFFECT.easingPower);
          const settleScale =
            1 + Math.sin(raw * Math.PI) * (TILE_SETTLE_EFFECT.peakScale - 1);
          const center = {
            x: fromCenter.x + (targetCenter.x - fromCenter.x) * eased,
            y: fromCenter.y + (targetCenter.y - fromCenter.y) * eased,
          };
          states.forEach(({ tile, from, target }) => {
            const x = from.x + (target.x - from.x) * eased;
            const y = from.y + (target.y - from.y) * eased;
            setTileTransform(
              tile,
              center.x + (x - center.x) * settleScale,
              center.y + (y - center.y) * settleScale,
              settleScale
            );
          });
        },
        onComplete: () => {
          activeTweens.delete(tween);
          states.forEach(({ tile, target }) => {
            setTileTransform(tile, target.x, target.y);
            tweens.delete(tile);
            onMemberSettled?.(tile);
          });
        },
      });
      activeTweens.add(tween);
      members.forEach((tile) => tweens.set(tile, tween));
    };

    const moveToSlot = (tile: Tile, animate = true, onSettled?: () => void) => {
      moveTilesToSlots([tile], animate, onSettled);
    };

    const stopConnectionPulsesFor = (members: Iterable<Tile>) => {
      const pulseGroups = new Set<Set<Tile>>();
      for (const tile of members) {
        const pulseGroup = connectionPulseGroups.get(tile);
        if (pulseGroup) pulseGroups.add(pulseGroup);
      }
      pulseGroups.forEach((pulseGroup) => {
        const stoppedTweens = new Set<gsap.core.Tween>();
        pulseGroup.forEach((tile) => {
          const tween = connectionTweens.get(tile);
          if (tween) stoppedTweens.add(tween);
          connectionTweens.delete(tile);
          if (connectionPulseGroups.get(tile) === pulseGroup)
            connectionPulseGroups.delete(tile);
          tile.connectionOutline.visible = false;
          tile.connectionOutline.tint = 0xffffff;
          tile.connectionOutline.alpha = 1;
        });
        stoppedTweens.forEach((tween) => {
          tween.kill();
          activeTweens.delete(tween);
        });
      });
    };

    const pulseConnections = (members: Set<Tile>) => {
      if (reduceMotion) return;
      stopConnectionPulsesFor(members);
      members.forEach((tile) => connectionPulseGroups.set(tile, members));
      members.forEach((tile) => {
        tile.connectionOutline.visible = true;
      });
      const motion = { progress: 0 };
      const tween = gsap.to(motion, {
        duration: CONNECTION_EFFECT.duration,
        ease: "none",
        progress: 1,
        onUpdate: () => {
          const progress = motion.progress;
          members.forEach((tile) => {
            tile.connectionOutline.tint =
              progress < CONNECTION_EFFECT.hotPhaseEnd
                ? CONNECTION_EFFECT.hotColor
                : progress < CONNECTION_EFFECT.glowPhaseEnd
                ? CONNECTION_EFFECT.glowColor
                : 0xffffff;
            tile.connectionOutline.alpha =
              CONNECTION_EFFECT.minimumAlpha +
              Math.abs(Math.sin(progress * Math.PI * 2)) *
                (1 - CONNECTION_EFFECT.minimumAlpha);
          });
        },
        onComplete: () => {
          activeTweens.delete(tween);
          members.forEach((tile) => {
            tile.connectionOutline.visible = false;
            tile.connectionOutline.tint = 0xffffff;
            tile.connectionOutline.alpha = 1;
            connectionTweens.delete(tile);
            if (connectionPulseGroups.get(tile) === members)
              connectionPulseGroups.delete(tile);
          });
        },
      });
      activeTweens.add(tween);
      members.forEach((tile) => {
        connectionTweens.set(tile, tween);
      });
    };

    const connectedNeighbors = (a: Tile, b: Tile): boolean => {
      const aOriginal = coordinateFor(a.row, a.col);
      const bOriginal = coordinateFor(b.row, b.col);
      const aPlaced = slotCoordinate(a.slot);
      const bPlaced = slotCoordinate(b.slot);
      return (
        bPlaced.q - aPlaced.q === bOriginal.q - aOriginal.q &&
        bPlaced.r - aPlaced.r === bOriginal.r - aOriginal.r &&
        coordinateDistance(aOriginal, bOriginal) === 1
      );
    };

    const drawComponentOutline = (component: Tile[]) => {
      const componentCoordinates = new Set(
        component.map((tile) => coordinateKey(slotCoordinate(tile.slot)))
      );
      const style = {
        color: 0xffffff,
        width: gameConfig.pieces.outlineWidth,
        alpha: 0.98,
      };
      component.forEach((member) => {
        const current = slotCoordinate(member.slot);
        [member.outline, member.connectionOutline].forEach((outline) => {
          outline.clear();
          outlineDirections.forEach((direction, edge) => {
            if (direction) {
              const neighbor = {
                q: current.q + direction.q,
                r: current.r + direction.r,
              };
              if (componentCoordinates.has(coordinateKey(neighbor))) return;
            }
            const pointIndex = edge * 2;
            const nextPointIndex = ((edge + 1) % outlineDirections.length) * 2;
            outline
              .moveTo(tilePoints[pointIndex], tilePoints[pointIndex + 1])
              .lineTo(
                tilePoints[nextPointIndex],
                tilePoints[nextPointIndex + 1]
              )
              .stroke(style);
          });
        });
      });
    };

    const recomputeConnections = (): number => {
      const links = new Map<Tile, Set<Tile>>(
        tiles.map((tile) => [tile, new Set<Tile>()])
      );
      const nextConnectedPairs = new Set<string>();
      const newlyConnectedTiles = new Set<Tile>();
      for (let slot = 0; slot < occupancy.length; slot++) {
        const tile = occupancy[slot]!;
        const current = slotCoordinate(slot);
        forwardDirections.forEach((direction) => {
          const neighborSlot = coordinateToSlot({
            q: current.q + direction.q,
            r: current.r + direction.r,
          });
          if (neighborSlot === undefined) return;
          const neighbor = occupancy[neighborSlot]!;
          if (connectedNeighbors(tile, neighbor)) {
            const tileId = tile.row * gridSize + tile.col;
            const neighborId = neighbor.row * gridSize + neighbor.col;
            const pairKey =
              tileId < neighborId
                ? `${tileId}:${neighborId}`
                : `${neighborId}:${tileId}`;
            nextConnectedPairs.add(pairKey);
            if (hasReported && !connectedPairs.has(pairKey)) {
              newlyConnectedTiles.add(tile);
              newlyConnectedTiles.add(neighbor);
            }
            links.get(tile)!.add(neighbor);
            links.get(neighbor)!.add(tile);
          }
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
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              stack.push(neighbor);
            }
          });
        }
        component.forEach((member) => {
          member.group = groupCount;
        });
        connectedGroups.set(groupCount, component);
        drawComponentOutline(component);
        groupCount += 1;
      }
      connectedPairs = nextConnectedPairs;
      const newlyConnectedGroups = new Set(
        [...newlyConnectedTiles].map((tile) => tile.group)
      );
      const highlightedOutlines = new Set(
        [...newlyConnectedGroups].flatMap(
          (group) => connectedGroups.get(group) ?? []
        )
      );
      pulseConnections(highlightedOutlines);
      won =
        activeDrags.size === 0 &&
        tiles.every((tile) => tile.slot === tile.row * gridSize + tile.col);
      return groupCount;
    };

    const report = () => {
      const groups = recomputeConnections();
      if (startingGroups === 0) startingGroups = groups;
      onProgress({
        slots: tiles.map((tile) => tile.slot),
        moves,
        groups,
        won,
        startingGroups,
        moveLimit,
      });
      hasReported = true;
    };

    const slotDistance = (a: number, b: number) =>
      coordinateDistance(slotCoordinate(a), slotCoordinate(b));

    const relocateGroup = (
      anchor: Tile,
      members: Tile[],
      requestedSlot: number,
      onMemberSettled?: (tile: Tile) => void
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
        moveTilesToSlots(members, true, (tile) => {
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
      stopConnectionPulsesFor(displaced);

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
      const reportAfterLanding = (tile: Tile) => {
        settlingTiles.delete(tile);
        tilesAwaitingLanding -= 1;
        if (tilesAwaitingLanding === 0) report();
      };
      moveTilesToSlots(members, true, (tile) => {
        onMemberSettled?.(tile);
        reportAfterLanding(tile);
      });
      displaced.forEach((tile) =>
        moveToSlot(tile, true, () => reportAfterLanding(tile))
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

        const tile: Tile = {
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
        moveToSlot(tile, false);

        view.on("pointerdown", (event: FederatedPointerEvent) => {
          if (won || settlingTiles.has(tile)) return;
          const members = [...(connectedGroups.get(tile.group) ?? [tile])];
          if (
            activeDrags.has(event.pointerId) ||
            members.some((member) => settlingTiles.has(member)) ||
            !canStartGroupDrag(
              members,
              [...activeDrags.values()].map((drag) => drag.members)
            )
          )
            return;
          stopConnectionPulsesFor(members);
          if (!started) {
            started = true;
            onStart();
          }
          const origins = new Map<Tile, { x: number; y: number }>();
          activeDrags.set(event.pointerId, {
            anchor: tile,
            members,
            start: { x: event.global.x, y: event.global.y },
            origins,
          });
          members.forEach((member) => {
            const oldTween = tweens.get(member);
            if (oldTween) {
              oldTween.kill();
              activeTweens.delete(oldTween);
              tweens.delete(member);
              const scale = member.view.scale.x;
              setTileTransform(
                member,
                member.view.x + (tileWidth * (scale - 1)) / 2,
                member.view.y + (tileHeight * (scale - 1)) / 2
              );
            }
            origins.set(member, { x: member.view.x, y: member.view.y });
            member.view.cursor = "grabbing";
            dragLayer.addChild(member.view);
            moveOutlineToDragLayer(member);
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
        attachOutlineToTile(tile);
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
        setTileTransform(tile, origin.x + dx, origin.y + dy);
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
    activeTweens.forEach((tween) => tween.kill());
    activeTweens.clear();
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
