import {
  Container,
  Graphics,
  Polygon,
  Rectangle,
  Sprite,
  Texture,
} from "pixi.js";
import type { GridSize } from "../../types/gameTypes";
import type { PuzzleBoardGeometry } from "./puzzleBoardGeometry";
import type { PuzzleTile } from "./puzzleBoardTypes";

type CreatePuzzleTilesOptions = {
  baseTexture: Texture;
  textureWidth: number;
  textureHeight: number;
  gridSize: GridSize;
  initialSlots: readonly number[];
  geometry: PuzzleBoardGeometry;
  tileLayer: Container;
  connectionEffectLayer: Container;
};

export function createPuzzleTiles({
  baseTexture,
  textureWidth,
  textureHeight,
  gridSize,
  initialSlots,
  geometry,
  tileLayer,
  connectionEffectLayer,
}: CreatePuzzleTilesOptions): {
  tiles: PuzzleTile[];
  occupancy: Array<PuzzleTile | undefined>;
} {
  const sourceCellWidth = textureWidth / gridSize;
  const sourceCellHeight = textureHeight / gridSize;
  const tiles: PuzzleTile[] = [];
  const occupancy: Array<PuzzleTile | undefined> = Array(gridSize * gridSize);

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const index = row * gridSize + col;
      const view = new Container();
      const sprite = createTileSprite({
        baseTexture,
        row,
        col,
        index,
        sourceCellWidth,
        sourceCellHeight,
        geometry,
      });
      const outline = new Graphics();
      const connectionOutline = new Graphics();
      connectionOutline.visible = false;

      if (geometry.isRectangle) {
        view.addChild(sprite);
      } else {
        const mask = new Graphics().poly(geometry.tilePoints).fill(0xffffff);
        sprite.mask = mask;
        view.addChild(sprite, mask);
      }

      outline.eventMode = "none";
      view.addChild(outline);
      view.eventMode = "static";
      view.cursor = "grab";
      view.hitArea = geometry.isRectangle
        ? new Rectangle(0, 0, geometry.tileWidth, geometry.tileHeight)
        : new Polygon(geometry.tilePoints);

      const tile: PuzzleTile = {
        row,
        col,
        group: index,
        slot: initialSlots[index],
        view,
        outline,
        connectionOutline,
      };
      const position = geometry.slotPosition(tile.slot);
      view.position.set(position.x, position.y);
      connectionOutline.position.set(position.x, position.y);

      tiles.push(tile);
      occupancy[tile.slot] = tile;
      tileLayer.addChild(view);
      connectionEffectLayer.addChild(connectionOutline);
    }
  }

  return { tiles, occupancy };
}

type CreateTileSpriteOptions = {
  baseTexture: Texture;
  row: number;
  col: number;
  index: number;
  sourceCellWidth: number;
  sourceCellHeight: number;
  geometry: PuzzleBoardGeometry;
};

function createTileSprite({
  baseTexture,
  row,
  col,
  index,
  sourceCellWidth,
  sourceCellHeight,
  geometry,
}: CreateTileSpriteOptions): Sprite {
  const sprite = geometry.isHexagon
    ? new Sprite(baseTexture)
    : new Sprite(
        new Texture({
          source: baseTexture.source,
          frame: new Rectangle(
            col * sourceCellWidth,
            row * sourceCellHeight,
            sourceCellWidth,
            sourceCellHeight,
          ),
        }),
      );

  if (geometry.isHexagon) {
    const originalPosition = geometry.slotPosition(index);
    sprite.width = geometry.hexImageSize;
    sprite.height = geometry.hexImageSize;
    sprite.position.set(
      geometry.hexImageX - originalPosition.x,
      geometry.hexImageY - originalPosition.y,
    );
  } else {
    sprite.width = geometry.tileWidth;
    sprite.height = geometry.tileHeight;
  }
  sprite.roundPixels = true;
  return sprite;
}
