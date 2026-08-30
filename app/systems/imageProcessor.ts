export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:\/\//i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The puzzle image could not be loaded."));
    image.src = src;
  });
}

export function squareCrop(width: number, height: number): { x: number; y: number; size: number } {
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

export function centerCrop(
  width: number,
  height: number,
  targetAspectRatio: number,
): { x: number; y: number; width: number; height: number } {
  if (width / height > targetAspectRatio) {
    const cropWidth = height * targetAspectRatio;
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height };
  }
  const cropHeight = width / targetAspectRatio;
  return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight };
}

export function normalizeImage(
  image: HTMLImageElement,
  textureWidth: number,
  textureHeight = textureWidth,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = textureWidth;
  canvas.height = textureHeight;
  const context = canvas.getContext("2d")!;
  const crop = centerCrop(image.naturalWidth, image.naturalHeight, textureWidth / textureHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    textureWidth,
    textureHeight,
  );
  return canvas;
}

export function createSampleImage(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, 1200);
  sky.addColorStop(0, "#a9d8d5");
  sky.addColorStop(.57, "#f4d6a0");
  sky.addColorStop(1, "#e97b55");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1200, 1200);
  ctx.fillStyle = "#fff4c7";
  ctx.beginPath();
  ctx.arc(890, 245, 116, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6a9b8b";
  ctx.beginPath();
  ctx.moveTo(0, 710); ctx.lineTo(290, 365); ctx.lineTo(520, 690); ctx.lineTo(745, 410); ctx.lineTo(1200, 770); ctx.lineTo(1200, 1200); ctx.lineTo(0, 1200); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2e6962";
  ctx.beginPath();
  ctx.moveTo(0, 840); ctx.lineTo(220, 635); ctx.lineTo(390, 785); ctx.lineTo(620, 570); ctx.lineTo(825, 790); ctx.lineTo(1040, 600); ctx.lineTo(1200, 730); ctx.lineTo(1200, 1200); ctx.lineTo(0, 1200); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#163f42";
  ctx.fillRect(0, 930, 1200, 270);
  [80, 180, 310, 455, 620, 790, 950, 1080].forEach((x, index) => {
    const y = 850 + (index % 3) * 32;
    ctx.fillStyle = index % 2 ? "#173f42" : "#245b58";
    for (let tier = 0; tier < 3; tier++) {
      ctx.beginPath();
      ctx.moveTo(x, y - 230 + tier * 70);
      ctx.lineTo(x - 92 + tier * 15, y - 55 + tier * 48);
      ctx.lineTo(x + 92 - tier * 15, y - 55 + tier * 48);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(x - 10, y - 20, 20, 120);
  });
  ctx.fillStyle = "rgba(255,255,255,.42)";
  ctx.beginPath(); ctx.moveTo(290, 365); ctx.lineTo(215, 495); ctx.lineTo(318, 430); ctx.lineTo(376, 490); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(745, 410); ctx.lineTo(661, 540); ctx.lineTo(748, 494); ctx.lineTo(817, 560); ctx.closePath(); ctx.fill();
  return canvas.toDataURL("image/jpeg", .92);
}
