import type {
  EventListener,
  EventPayloads,
  EventTypes,
} from "../types/eventTypes";

type AnyEventListener = (payload: EventPayloads[EventTypes]) => void;

export class EventsManager {
  private readonly listeners = new Map<EventTypes, Set<AnyEventListener>>();

  on<Type extends EventTypes>(
    type: Type,
    listener: EventListener<Type>,
  ): () => void {
    const listeners = this.listeners.get(type) ?? new Set<AnyEventListener>();
    listeners.add(listener as AnyEventListener);
    this.listeners.set(type, listeners);
    return () => this.off(type, listener);
  }

  once<Type extends EventTypes>(
    type: Type,
    listener: EventListener<Type>,
  ): () => void {
    let unsubscribe: () => void = () => undefined;
    const onceListener: EventListener<Type> = (payload) => {
      unsubscribe();
      listener(payload);
    };
    unsubscribe = this.on(type, onceListener);
    return unsubscribe;
  }

  off<Type extends EventTypes>(type: Type, listener: EventListener<Type>): void {
    const listeners = this.listeners.get(type);
    listeners?.delete(listener as AnyEventListener);
    if (listeners?.size === 0) this.listeners.delete(type);
  }

  emit<Type extends EventTypes>(type: Type, payload: EventPayloads[Type]): void {
    const listeners = this.listeners.get(type);
    if (!listeners) return;
    [...listeners].forEach((listener) => listener(payload));
  }

  clear(type?: EventTypes): void {
    if (type) this.listeners.delete(type);
    else this.listeners.clear();
  }
}

export const eventsManager = new EventsManager();
