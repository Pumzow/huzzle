import { seededRandom } from "./levelDesign";

export const offlineVisualFamilies = [
  "mountains",
  "city",
  "islands",
  "space",
  "geometry",
  "garden",
  "desert",
  "underwater",
  "night",
  "architecture",
] as const;

export type OfflineVisualFamily = (typeof offlineVisualFamilies)[number];

export type OfflineLevelVisual = {
  levelIndex: number;
  family: OfflineVisualFamily;
  familyIndex: number;
  templateIndex: number;
  seed: number;
};

const SIZE = 1200;

export function offlineLevelVisual(levelIndex: number): OfflineLevelVisual {
  const normalized = Math.max(0, Math.trunc(levelIndex));
  const familyIndex = normalized % offlineVisualFamilies.length;
  return {
    levelIndex: normalized,
    family: offlineVisualFamilies[familyIndex],
    familyIndex,
    templateIndex: Math.floor(normalized / offlineVisualFamilies.length) % 3,
    seed: Math.imul(normalized + 1, 0x9e3779b1) >>> 0,
  };
}

export function createOfflineLevelImage(levelIndex: number): string {
  const visual = offlineLevelVisual(levelIndex);
  const random = seededRandom(visual.seed);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  renderers[visual.family](context, visual.templateIndex, random);
  addTexture(context, random);
  return canvas.toDataURL("image/jpeg", 0.9);
}

type Random = () => number;
type Renderer = (context: CanvasRenderingContext2D, template: number, random: Random) => void;

function background(context: CanvasRenderingContext2D, top: string, bottom: string): void {
  const gradient = context.createLinearGradient(0, 0, 0, SIZE);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, SIZE, SIZE);
}

function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function polygon(context: CanvasRenderingContext2D, points: readonly [number, number][], color: string): void {
  context.fillStyle = color;
  context.beginPath();
  points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
  context.closePath();
  context.fill();
}

function pick<T>(values: readonly T[], random: Random): T {
  return values[Math.floor(random() * values.length)];
}

function mountains(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, pick(["#8bd3dd", "#b8d8d8", "#9ec5e5"], random), "#f3b26d");
  circle(context, template === 1 ? 260 : 900, 190 + template * 60, 105, "#fff0b5");
  const horizon = 690 - template * 55;
  for (let layer = 0; layer < 3; layer += 1) {
    const color = ["#779b83", "#426e67", "#173f42"][layer];
    const points: [number, number][] = [[0, SIZE]];
    for (let x = -180; x <= 1380; x += 230) {
      points.push([x, horizon + layer * 120], [x + 120, horizon - 250 + random() * 150 + layer * 100]);
    }
    points.push([SIZE, SIZE]);
    polygon(context, points, color);
  }
  for (let index = 0; index < 15; index += 1) {
    const x = random() * SIZE;
    const y = 760 + random() * 350;
    polygon(context, [[x, y - 170], [x - 60, y], [x + 60, y]], index % 2 ? "#122f34" : "#245956");
  }
}

function city(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, ["#f8c8a1", "#8ab6d6", "#d5b4d8"][template], "#f5ead7");
  circle(context, 180 + template * 410, 190, 95, "rgba(255,245,190,.9)");
  let x = -20;
  while (x < SIZE) {
    const width = 90 + random() * 150;
    const height = 260 + random() * (430 + template * 70);
    const y = SIZE - height;
    context.fillStyle = pick(["#274c5e", "#3e6670", "#d56f56", "#675b7a"], random);
    context.fillRect(x, y, width, height);
    context.fillStyle = "#ffd87a";
    for (let wy = y + 45; wy < SIZE - 30; wy += 65)
      for (let wx = x + 25; wx < x + width - 15; wx += 50)
        if (random() > 0.28) context.fillRect(wx, wy, 18, 25);
    x += width + 14;
  }
}

function islands(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, "#73d7dc", "#075c79");
  const count = 3 + template * 2;
  for (let index = 0; index < count; index += 1) {
    const x = 130 + random() * 940;
    const y = 280 + random() * 650;
    const radius = 90 + random() * 130;
    circle(context, x, y + 25, radius, "#dcb66d");
    circle(context, x, y, radius * 0.86, pick(["#4d9d68", "#67b56c", "#2e7b5b"], random));
    for (let palm = 0; palm < 2 + template; palm += 1) {
      const px = x - radius / 2 + random() * radius;
      context.strokeStyle = "#5a422b"; context.lineWidth = 12;
      context.beginPath(); context.moveTo(px, y); context.lineTo(px + 12, y - 95); context.stroke();
      circle(context, px + 12, y - 100, 35, "#176b55");
    }
  }
  context.strokeStyle = "rgba(255,255,255,.55)"; context.lineWidth = 9;
  for (let wave = 0; wave < 9; wave += 1) {
    const y = 100 + wave * 125 + random() * 30;
    context.beginPath(); context.moveTo(0, y); context.bezierCurveTo(300, y - 35, 600, y + 35, SIZE, y); context.stroke();
  }
}

function space(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, ["#090b2d", "#1c1647", "#071d36"][template], "#3d1855");
  for (let index = 0; index < 130; index += 1) circle(context, random() * SIZE, random() * SIZE, 1 + random() * 5, "rgba(255,255,230,.8)");
  for (let index = 0; index < 3 + template; index += 1) {
    const x = 130 + random() * 940, y = 150 + random() * 850, radius = 55 + random() * 130;
    circle(context, x, y, radius, pick(["#ff8f70", "#6fe1d2", "#bea1ff", "#f8d266"], random));
    if (index === template) {
      context.strokeStyle = "rgba(255,255,255,.65)"; context.lineWidth = 20;
      context.beginPath(); context.ellipse(x, y, radius * 1.7, radius * .38, -.3, 0, Math.PI * 2); context.stroke();
    }
  }
}

function geometry(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, ["#f4e7d3", "#162f38", "#f2c85b"][template], ["#e99a73", "#285f64", "#e86b58"][template]);
  const colors = ["#ed694a", "#24a69a", "#ffd059", "#254b59", "#f6efe1"];
  for (let index = 0; index < 32; index += 1) {
    const x = random() * SIZE, y = random() * SIZE, size = 45 + random() * 170;
    context.save(); context.translate(x, y); context.rotate(random() * Math.PI);
    if ((index + template) % 3 === 0) circle(context, 0, 0, size / 2, pick(colors, random));
    else if ((index + template) % 3 === 1) { context.fillStyle = pick(colors, random); context.fillRect(-size / 2, -size / 2, size, size); }
    else polygon(context, [[0, -size], [size * .8, size * .6], [-size * .8, size * .6]], pick(colors, random));
    context.restore();
  }
}

function garden(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, ["#dff0c7", "#ffe1d8", "#d9d6f2"][template], "#56865a");
  for (let index = 0; index < 34 + template * 8; index += 1) {
    const x = random() * SIZE, y = 170 + random() * 920, radius = 22 + random() * 50;
    context.strokeStyle = "#47734d"; context.lineWidth = 8; context.beginPath(); context.moveTo(x, SIZE); context.quadraticCurveTo(x + 40, y + 80, x, y); context.stroke();
    const color = pick(["#ec6f75", "#f4b84b", "#9a70ba", "#fff0e0", "#ed8eb7"], random);
    for (let petal = 0; petal < 6; petal += 1) circle(context, x + Math.cos(petal * Math.PI / 3) * radius, y + Math.sin(petal * Math.PI / 3) * radius, radius * .62, color);
    circle(context, x, y, radius * .52, "#734a35");
  }
}

function desert(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, ["#86c9d1", "#f4b48a", "#80658a"][template], "#f3ca78");
  circle(context, template === 2 ? 250 : 920, 210, 110, "#ffe6a0");
  for (let dune = 0; dune < 4; dune += 1) {
    context.fillStyle = ["#e6a75c", "#d7854f", "#ba6846", "#8f5141"][dune];
    context.beginPath(); context.moveTo(0, 650 + dune * 125); context.bezierCurveTo(260, 440 + dune * 150, 560, 840 + dune * 80, SIZE, 560 + dune * 145); context.lineTo(SIZE, SIZE); context.lineTo(0, SIZE); context.fill();
  }
  for (let index = 0; index < 3 + template; index += 1) {
    const x = 100 + random() * 1000, y = 650 + random() * 350;
    context.fillStyle = "#356a56"; context.fillRect(x - 16, y - 130, 32, 170); context.fillRect(x - 65, y - 90, 55, 25); context.fillRect(x + 10, y - 55, 55, 25);
    circle(context, x - 65, y - 90, 13, "#356a56"); circle(context, x + 65, y - 55, 13, "#356a56");
  }
}

function underwater(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, ["#62d1cf", "#399ac2", "#245aa0"][template], "#062f55");
  for (let index = 0; index < 18; index += 1) circle(context, random() * SIZE, random() * 800, 5 + random() * 18, "rgba(215,250,255,.45)");
  for (let index = 0; index < 12 + template * 4; index += 1) {
    const x = 80 + random() * 1040, y = 180 + random() * 720, length = 55 + random() * 110;
    context.save(); context.translate(x, y); if (random() > .5) context.scale(-1, 1);
    context.fillStyle = pick(["#ffb44f", "#ef6b65", "#d8e86b", "#9f8de3"], random);
    context.beginPath(); context.ellipse(0, 0, length, length * .42, 0, 0, Math.PI * 2); context.fill();
    polygon(context, [[-length * .7, 0], [-length * 1.25, -length * .45], [-length * 1.25, length * .45]], context.fillStyle as string);
    circle(context, length * .5, -8, 7, "#102f45"); context.restore();
  }
  for (let index = 0; index < 20; index += 1) {
    context.strokeStyle = pick(["#ef6d76", "#e6a454", "#4fa77b"], random); context.lineWidth = 15;
    const x = random() * SIZE; context.beginPath(); context.moveTo(x, SIZE); context.quadraticCurveTo(x + 55, 1050, x + (random() - .5) * 90, 900 - random() * 180); context.stroke();
  }
}

function night(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, ["#162040", "#25335c", "#1b3949"][template], "#080f22");
  circle(context, 220 + template * 370, 210, 105, "#fff2c7");
  if (template === 1) circle(context, 265 + template * 370, 175, 105, "#25335c");
  for (let index = 0; index < 75; index += 1) circle(context, random() * SIZE, random() * 680, 1 + random() * 4, "#fff5ce");
  polygon(context, [[0, 780], [260, 570], [480, 760], [720, 500], [930, 730], [1200, 560], [1200, 1200], [0, 1200]], "#142d38");
  context.fillStyle = "#071b24"; context.fillRect(0, 900, SIZE, 300);
  for (let index = 0; index < 18; index += 1) {
    const x = random() * SIZE, y = 840 + random() * 170;
    polygon(context, [[x, y - 180], [x - 55, y], [x + 55, y]], "#0c2730");
  }
}

function architecture(context: CanvasRenderingContext2D, template: number, random: Random): void {
  background(context, ["#f8d878", "#7ad0c7", "#ee9a91"][template], "#f3ead4");
  const colors = ["#ed674c", "#176c75", "#f2c14d", "#f7efe0", "#6a4f83"];
  const rows = 3 + template;
  for (let row = 0; row < rows; row += 1) {
    const y = 140 + row * (900 / rows);
    for (let column = 0; column < 5; column += 1) {
      const width = 150 + random() * 70, height = 140 + random() * 100, x = 20 + column * 240 + random() * 30;
      context.fillStyle = pick(colors, random); context.fillRect(x, y, width, height);
      circle(context, x + width / 2, y + height * .52, 30 + random() * 22, pick(colors, random));
      context.fillStyle = "rgba(255,255,255,.75)"; context.fillRect(x + 18, y + 18, 32, 48);
    }
  }
}

const renderers: Record<OfflineVisualFamily, Renderer> = {
  mountains, city, islands, space, geometry, garden, desert, underwater, night, architecture,
};

function addTexture(context: CanvasRenderingContext2D, random: Random): void {
  context.save();
  context.globalAlpha = 0.06;
  for (let index = 0; index < 900; index += 1) {
    context.fillStyle = random() > .5 ? "#fff" : "#000";
    context.fillRect(random() * SIZE, random() * SIZE, 1 + random() * 4, 1 + random() * 4);
  }
  context.restore();
}
