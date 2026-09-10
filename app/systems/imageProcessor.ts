import { createOfflineLevelImage } from "./offlineLevelGenerator";

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
  return createOfflineLevelImage(0);
}
