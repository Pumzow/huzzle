import { gsap } from "gsap";
import { eventsManager } from "../systems/eventsManager";
import { EventTypes, type BangUpSource } from "../types/eventTypes";

export type BangUpOptions = {
  target: { value: number };
  to: number;
  duration?: number;
  eventSource?: BangUpSource;
  tween?: gsap.TweenVars;
};

export function bangUp(options: BangUpOptions): gsap.core.Timeline {
  const timeline = gsap.timeline();
  const duration = options.duration ?? 1;
  const eventSource = options.eventSource;

  if (eventSource) {
    eventsManager.emit(EventTypes.BangUpStart, {
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
        eventsManager.emit(EventTypes.BangUpEnd, {
          source: eventSource,
        });
      },
      [],
      duration,
    );
  }

  return timeline;
}
