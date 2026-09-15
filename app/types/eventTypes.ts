export enum EventTypes {
  GameEntered = "game:entered",
  BangUpStart = "effect:bang-up-start",
  BangUpEnd = "effect:bang-up-end",
  TilePickedUp = "puzzle:tile-picked-up",
  TilePlaced = "puzzle:tile-placed",
  TilesCombined = "puzzle:tiles-combined",
  CompletionStarShown = "puzzle:completion-star-shown",
  LevelCompleted = "puzzle:level-completed",
}

export type BangUpSource = "completion-points";

export type EventPayloads = {
  [EventTypes.GameEntered]: {
    source: "intro";
  };
  [EventTypes.BangUpStart]: {
    source: BangUpSource;
  };
  [EventTypes.BangUpEnd]: {
    source: BangUpSource;
  };
  [EventTypes.TilePickedUp]: Record<string, never>;
  [EventTypes.TilePlaced]: Record<string, never>;
  [EventTypes.TilesCombined]: {
    connectedTileCount: number;
  };
  [EventTypes.CompletionStarShown]: {
    starNumber: number;
  };
  [EventTypes.LevelCompleted]: {
    levelId: number | null;
    offline: boolean;
    stars: number;
    perfect: boolean;
  };
};

export type EventListener<Type extends EventTypes> = (
  payload: EventPayloads[Type],
) => void;
