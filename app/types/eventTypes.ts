export enum EventTypes {
  GameEntered = "game:entered",
  TilesCombined = "puzzle:tiles-combined",
  LevelCompleted = "puzzle:level-completed",
}

export type EventPayloads = {
  [EventTypes.GameEntered]: {
    source: "intro";
  };
  [EventTypes.TilesCombined]: {
    connectedTileCount: number;
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
