import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds the static Huzzle application shell", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<title>Huzzle — Picture Puzzle Prototype<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /type="module"/);
});

test("keeps the core PIXI puzzle mechanics configured", async () => {
  const source = await readFile(new URL("../app/pixi-puzzle.tsx", import.meta.url), "utf8");
  assert.match(source, /export type GridSize = 4 \| 6 \| 8/);
  assert.match(source, /const TILE_GAP = 0/);
  assert.match(source, /const TILE_TEXTURE_SIZE = 256/);
  assert.match(source, /normalizeImage/);
  assert.match(source, /gridSize \* TILE_TEXTURE_SIZE/);
  assert.match(source, /sprite\.roundPixels = true/);
  assert.doesNotMatch(source, /const shadow = new Graphics/);
  assert.match(source, /relocateGroup/);
  assert.match(source, /recomputeConnections/);
  assert.match(source, /connectedNeighbors/);
  assert.match(source, /drawComponentOutline/);
  assert.match(source, /color: 0xffffff, width: 3/);
  assert.doesNotMatch(source, /outline\.roundRect/);
  assert.match(source, /activeGroup\.forEach/);
  assert.match(source, /pointerdown/);
  assert.match(source, /pointermove/);
  assert.match(source, /tile\.slot === tile\.row \* gridSize \+ tile\.col/);

  const studio = await readFile(new URL("../app/puzzle-studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /const GRID_OPTIONS: GridSize\[\] = \[4, 6, 8\]/);
  assert.match(studio, /gridSize=\{gridSize\}/);
  assert.match(studio, /changeGridSize/);
  assert.match(studio, /huzzle-theme/);
  assert.match(studio, /Switch to \$\{theme === "light" \? "dark" : "light"\} mode/);

  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /:root\[data-theme="dark"\]/);
  assert.match(styles, /\.theme-toggle/);

  assert.doesNotMatch(studio, /picture puzzle lab/);
  assert.doesNotMatch(studio, /Build the whole picture/);
  assert.doesNotMatch(studio, /Mechanic prototype/);
  assert.doesNotMatch(studio, /PIXI\.js interaction prototype/);
  assert.doesNotMatch(studio, /landscapes and square images work best/);
  assert.doesNotMatch(studio, /Correct neighbors connect into movable sets/);
  assert.doesNotMatch(studio, /Shuffle and restart puzzle/);
  assert.doesNotMatch(studio, /Swap tiles\. Build connected sets/);
  assert.doesNotMatch(studio, /Every tile stays inside the square playfield/);
  assert.doesNotMatch(studio, /Drag a tile/);
  assert.doesNotMatch(studio, /Release and displaced tiles/);
  assert.doesNotMatch(studio, /The outer outline shows exactly what moves together/);
  assert.doesNotMatch(studio, /Choose another image/);
  assert.match(studio, />Upload image<input/);
  assert.ok(studio.indexOf("Upload image") < studio.indexOf('className="grid-picker"'));
});
