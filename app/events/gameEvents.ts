import {
  EventsManager,
  type EventDefinition,
} from "@pumzow/game-engine";

export const eventDefinitions = {
  GameEntered: { name: "game:entered" },
  BangUpStart: { name: "effect:bang-up-start" },
  BangUpEnd: { name: "effect:bang-up-end" },
  TilePickedUp: { name: "puzzle:tile-picked-up" },
  TilePlaced: { name: "puzzle:tile-placed" },
  TilesCombined: { name: "puzzle:tiles-combined" },
  CompletionStarShown: { name: "puzzle:completion-star-shown" },
  LevelCompleted: { name: "puzzle:level-completed" },
  AdStarted: { name: "ads:started" },
  AdFinished: { name: "ads:finished" },
} satisfies Record<string, EventDefinition>;

export const gameEvents = new EventsManager();
