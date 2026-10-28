import { gsap } from "gsap";
import { eventDefinitions, gameEvents } from "../events/gameEvents";

export type BangUpOptions = {
  target: { value: number };
  to: number;
  duration?: number;
  eventSource?: string;
  tween?: gsap.TweenVars;
};

export function bangUp(options: BangUpOptions): gsap.core.Timeline {
  const timeline = gsap.timeline();
  const duration = options.duration ?? 1;
  const eventSource = options.eventSource;

  if (eventSource) {
    gameEvents.emit(eventDefinitions.BangUpStart, {
      source: eventSource,
    });
  }

  timeline.to(
    options.target,
    {
      ...options.tween,
      duration,
      value: options.to,
    },
    0,
  );

  if (eventSource) {
    timeline.call(
      () => {
        gameEvents.emit(eventDefinitions.BangUpEnd, {
          source: eventSource,
        });
      },
      [],
      duration,
    );
  }

  return timeline;
}
