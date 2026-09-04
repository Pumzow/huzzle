import {
  loadLevelImage,
  type LoadedLevel,
  type LevelSelectionOptions,
} from "./levelService";
import { Utils } from "../utils/utils";

type LevelLoader = typeof loadLevelImage;

function preloadKey(levelsUrl: string, options: LevelSelectionOptions): string {
  return JSON.stringify([levelsUrl, options]);
}

export class LevelPreloader {
  private readonly tasks = new Map<string, Promise<LoadedLevel>>();

  constructor(private readonly loader: LevelLoader = loadLevelImage) {}

  preload(
    levelsUrl: string,
    options: LevelSelectionOptions,
    timeoutSeconds: number,
  ): Promise<LoadedLevel> {
    const key = preloadKey(levelsUrl, options);
    const existing = this.tasks.get(key);
    if (existing) return existing;

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(
      () => controller.abort(),
      Utils.toMilliseconds(timeoutSeconds),
    );
    const task = this.loader(levelsUrl, options, controller.signal)
      .catch((error) => {
        if (this.tasks.get(key) === task) this.tasks.delete(key);
        throw error;
      })
      .finally(() => {
        globalThis.clearTimeout(timeout);
        if (this.tasks.get(key) === task) this.tasks.delete(key);
      });
    this.tasks.set(key, task);
    return task;
  }

  take(
    levelsUrl: string,
    options: LevelSelectionOptions,
    timeoutSeconds: number,
  ): Promise<LoadedLevel> {
    const key = preloadKey(levelsUrl, options);
    const task = this.preload(levelsUrl, options, timeoutSeconds);
    this.tasks.delete(key);
    return task;
  }
}

export const levelPreloader = new LevelPreloader();
