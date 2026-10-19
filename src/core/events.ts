/**
 * Central Event Bus em TypeScript para comunicação desacoplada entre módulos
 * Evita variáveis globais soltas e chamadas circulares entre telas
 */
export type EventCallback<T = any> = (data: T) => void;

export class AppEventBus {
  private _listeners: Map<string, Set<EventCallback>> = new Map();

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (typeof callback !== 'function') return () => {};
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  once<T = any>(event: string, callback: EventCallback<T>): () => void {
    const unsubscribe = this.on<T>(event, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  off(event: string, callback: EventCallback): void {
    if (!this._listeners.has(event)) return;
    this._listeners.get(event)!.delete(callback);
    if (this._listeners.get(event)!.size === 0) {
      this._listeners.delete(event);
    }
  }

  emit<T = any>(event: string, data?: T): void {
    if (!this._listeners.has(event)) return;
    for (const callback of this._listeners.get(event)!) {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Erro ao processar ouvinte do evento "${event}":`, err);
      }
    }
  }

  clear(): void {
    this._listeners.clear();
  }
}

export const eventBus = new AppEventBus();

declare global {
  interface Window {
    AppEvents?: AppEventBus;
  }
}

if (typeof window !== 'undefined') {
  window.AppEvents = eventBus;
}
