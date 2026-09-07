import type { PuzzleSceneOptions } from "./puzzleSceneTypes";
import type { SceneConfiguration } from "./sceneConfigTypes";

export type SceneRoutes = {
  gameIntro: [preparation: Promise<void>];
  mainMenu: [];
  puzzle: [options?: PuzzleSceneOptions];
  customPuzzle: [initialImageFile: File];
};

export type SceneRoute = keyof SceneRoutes;

export interface SceneNavigator {
  navigate<Route extends SceneRoute>(
    route: Route,
    ...args: SceneRoutes[Route]
  ): void;
  navigateWhenReady<Route extends SceneRoute>(
    route: Route,
    ...args: SceneRoutes[Route]
  ): Promise<void>;
}

export type Scene = {
  destroy(): void;
  ready?: Promise<void>;
};

export type SceneType<Route extends SceneRoute> = {
  readonly sceneConfig: SceneConfiguration;
  new (
    root: HTMLElement,
    navigator: SceneNavigator,
    ...args: SceneRoutes[Route]
  ): Scene;
};

export type SceneRegistry = {
  [Route in SceneRoute]: SceneType<Route>;
};
