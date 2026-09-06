const MILLISECONDS_PER_SECOND = 1000;

export function wait(seconds: number): Promise<void> {
  return new Promise((resolve) =>
    globalThis.setTimeout(resolve, toMilliseconds(seconds)),
  );
}

export function toMilliseconds(seconds: number): number {
  return seconds * MILLISECONDS_PER_SECOND;
}

export function toSeconds(milliseconds: number): number {
  return milliseconds / MILLISECONDS_PER_SECOND;
}

export function toCssSeconds(seconds: number): string {
  return `${seconds}s`;
}
