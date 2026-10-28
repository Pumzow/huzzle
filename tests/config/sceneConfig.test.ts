import { describe, expect, test } from "bun:test";

import { customPuzzleSceneConfig } from "../../app/config/scenes/customPuzzleSceneConfig";
import { gameIntroSceneConfig } from "../../app/config/scenes/gameIntroSceneConfig";
import { mainMenuSceneConfig } from "../../app/config/scenes/mainMenuSceneConfig";
import { puzzleSceneConfig } from "../../app/config/scenes/puzzleSceneConfig";

describe("scene ad presentation", () => {
  test("keeps the banner out of the intro", () => {
    expect(gameIntroSceneConfig.ads.showBanner).toBe(false);
  });

  test("shows the banner in playable and menu scenes", () => {
    expect(mainMenuSceneConfig.ads.showBanner).toBe(true);
    expect(puzzleSceneConfig.ads.showBanner).toBe(true);
    expect(customPuzzleSceneConfig.ads.showBanner).toBe(true);
  });
});
