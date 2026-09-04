export class Utils {
  private static readonly millisecondsPerSecond = 1000;

  static wait(seconds: number): Promise<void> {
    return new Promise((resolve) => globalThis.setTimeout(resolve, Utils.toMilliseconds(seconds)));
  }

  static toMilliseconds(seconds: number): number {
    return seconds * Utils.millisecondsPerSecond;
  }

  static toSeconds(milliseconds: number): number {
    return milliseconds / Utils.millisecondsPerSecond;
  }

  static toCssSeconds(seconds: number): string {
    return `${seconds}s`;
  }
}
