import { expect, test } from "bun:test";

import { Utils } from "../../app/utils/utils";

test("converts time at browser API boundaries", () => {
  expect(Utils.toMilliseconds(1.25)).toBe(1250);
  expect(Utils.toSeconds(1250)).toBe(1.25);
  expect(Utils.toCssSeconds(0.32)).toBe("0.32s");
});

test("wait accepts seconds", async () => {
  const startedAt = performance.now();
  await Utils.wait(0.01);
  expect(performance.now() - startedAt).toBeGreaterThanOrEqual(5);
});
