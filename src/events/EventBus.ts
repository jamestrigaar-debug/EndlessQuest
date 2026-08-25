import type { GameEvent } from './GameEvent';

type EventCallback = (event: GameEvent) => void;

export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private globalListeners: Set<EventCallback> = new Set();

  subscribe(type: string, callback: EventCallback): void {
    if (type === '*') {
      this.globalListeners.add(callback);
      return;
    }
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  unsubscribe(type: string, callback: EventCallback): void {
    if (type === '*') {
      this.globalListeners.delete(callback);
      return;
    }
    const set = this.listeners.get(type);
    if (set) {
      set.delete(callback);
      if (set.size === 0) this.listeners.delete(type);
    }
  }

  emit(event: GameEvent): void {
    const specific = this.listeners.get(event.type);
    if (specific) {
      for (const cb of specific) {
        try {
          cb(event);
        } catch (e) {
          console.error('EventBus callback error', e);
        }
      }
    }
    // Also call wildcard listeners
    for (const cb of this.globalListeners) {
      try {
        cb(event);
      } catch (e) {
        console.error('EventBus global callback error', e);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
  }
}
