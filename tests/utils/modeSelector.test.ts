import { expect, test } from "bun:test";
import { modeFromSwipe } from "../../app/utils/modeSelector";

test("changes modes for intentional horizontal swipes", () => {
  expect(modeFromSwipe("casual", -80, 12, 60, 1.25)).toBe("challenge");
  expect(modeFromSwipe("challenge", 80, 12, 60, 1.25)).toBe("casual");
});

test("ignores short, vertical, and same-direction swipes", () => {
  expect(modeFromSwipe("casual", -40, 0, 60, 1.25)).toBeNull();
  expect(modeFromSwipe("casual", -80, 75, 60, 1.25)).toBeNull();
  expect(modeFromSwipe("casual", 80, 0, 60, 1.25)).toBeNull();
});
