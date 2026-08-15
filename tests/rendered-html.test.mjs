import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("defines a static Huzzle application shell", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<title>Huzzle — Picture Puzzle Prototype<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /app\/main\.tsx/);
});

test("keeps the PIXI puzzle interaction source", async () => {
  const source = await readFile(new URL("../app/pixi-puzzle.tsx", import.meta.url), "utf8");
  assert.match(source, /new Application/);
  assert.match(source, /pointerdown/);
  assert.match(source, /pointermove/);
});
