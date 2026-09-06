import { Application, Container, Graphics, Texture } from "pixi.js";
import { gameConfig } from "../../config/gameConfig";
import { loadImage, normalizeImage } from "../../systems/imageProcessor";
import { shuffledSlots } from "../../systems/puzzleLogic";
import { PuzzleBoardOptions } from "../../types/gameTypes";
import { createPuzzleBoardGeometry } from "./puzzleBoardGeometry";
import { PuzzleBoardEffects } from "./puzzleBoardEffects";
import { PuzzleBoardConnections } from "./puzzleBoardConnections";
import { PuzzleBoardInteraction } from "./puzzleBoardInteraction";
import { createPuzzleTiles } from "./puzzleTileFactory";

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
  let interaction: PuzzleBoardInteraction | null = null;

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
      boardWidth,
      boardHeight,
      boardX,
      boardY,
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
    const { tiles, occupancy } = createPuzzleTiles({
      baseTexture,
      textureWidth,
      textureHeight,
      gridSize,
      initialSlots,
      geometry,
      tileLayer,
      connectionEffectLayer,
    });
    const connections = new PuzzleBoardConnections(
      tiles,
      occupancy,
      gridSize,
      geometry,
      boardEffects,
    );
    interaction = new PuzzleBoardInteraction({
      stage: app.stage,
      tileLayer,
      dragLayer,
      tiles,
      occupancy,
      gridSize,
      initialSlots,
      initialState,
      scoring,
      geometry,
      effects: boardEffects,
      connections,
      onProgress,
      onStart,
    });
    const boardInteraction = interaction;
    tiles.forEach((tile) => boardInteraction.bindTile(tile));

    boardInteraction.bindStage();
    boardInteraction.reportInitialState();
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
    interaction?.destroy();
    interaction = null;
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
