import { expect, test } from "bun:test";

import { LevelPreloader } from "../../app/systems/levelPreloader";
import type { LevelSelectionOptions } from "../../app/systems/levelService";

test("shares a pending level preload and removes it when consumed", async () => {
  let calls = 0;
  const loader = async (_url: string, options: LevelSelectionOptions) => {
    calls += 1;
    return {
      id: options.currentLevelId ?? 0,
      imageUrl: `https://example.com/${options.currentLevelId ?? 0}.webp`,
    };
  };
  const preloader = new LevelPreloader(loader);
  const options = { mode: "sequence", currentLevelId: 4 } as const;

  const first = preloader.preload("https://example.com/levels.json", options, 1);
  const second = preloader.preload("https://example.com/levels.json", options, 1);

  expect(second).toBe(first);
  expect(await preloader.take("https://example.com/levels.json", options, 1)).toEqual({
    id: 4,
    imageUrl: "https://example.com/4.webp",
  });
  expect(calls).toBe(1);

  await preloader.preload("https://example.com/levels.json", options, 1);
  expect(calls).toBe(2);
});
