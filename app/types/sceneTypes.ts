import type { AdsManager } from "../systems/ads/adsManager";
import type { PuzzleSceneOptions } from "./puzzleSceneTypes";
import type { SceneConfiguration } from "./sceneConfigTypes";
import type { DebugSceneTarget } from "./debugTypes";

export type SceneRoutes = {
  gameIntro: [preparation: Promise<void>];
  mainMenu: [];
  puzzle: [options?: PuzzleSceneOptions];
  customPuzzle: [initialImageFile: File];
};

export type SceneRoute = keyof SceneRoutes;

export interface SceneNavigator {
  readonly adsManager: AdsManager;
  navigate<Route extends SceneRoute>(
    route: Route,
    ...args: SceneRoutes[Route]
  ): void;
  navigateWhenReady<Route extends SceneRoute>(
    route: Route,
    ...args: SceneRoutes[Route]
  ): Promise<void>;
  refreshHeader(): void;
}

export type Scene = DebugSceneTarget & {
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
