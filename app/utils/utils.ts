import { gsap } from "gsap";

export type BangUpOptions = {
  at?: number | string;
  duration: number;
  peakScale: number;
  ring?: gsap.TweenTarget;
  timeline?: gsap.core.Timeline;
};

export class Utils {
  private static readonly millisecondsPerSecond = 1000;

  static bangUp(
    target: gsap.TweenTarget,
    options: BangUpOptions
  ): gsap.core.Timeline {
    const timeline = options.timeline ?? gsap.timeline();
    const start = options.at ?? 0;
    const peakDuration = options.duration * 0.28;

    timeline.to(
      target,
      {
        duration: peakDuration,
        ease: "power2.out",
        filter:
          "brightness(1.8) drop-shadow(0 0 12px rgba(239,106,59,.55))",
        rotation: -3,
        scale: options.peakScale,
      },
      start
    );
    timeline.to(
      target,
      {
        duration: options.duration - peakDuration,
        ease: "elastic.out(1,.45)",
        filter: "brightness(1)",
        rotation: 0,
        scale: 1,
      },
      ">"
    );

    if (options.ring) {
      timeline.fromTo(
        options.ring,
        {
          autoAlpha: 0.7,
          scale: 0.65,
        },
        {
          autoAlpha: 0,
          duration: options.duration,
          ease: "power2.out",
          scale: 1.7,
        },
        start
      );
    }

    return timeline;
  }

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
