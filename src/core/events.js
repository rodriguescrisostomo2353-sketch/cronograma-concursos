/**
 * Central Event Bus para comunicação desacoplada entre módulos
 * Evita variáveis globais soltas e chamadas circulares entre telas
 */
class AppEventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      callback(...args);
    });
    return unsubscribe;
  }

  off(event, callback) {
    if (!this._listeners.has(event)) return;
    this._listeners.get(event).delete(callback);
    if (this._listeners.get(event).size === 0) {
      this._listeners.delete(event);
    }
  }

  emit(event, data) {
    if (!this._listeners.has(event)) return;
    for (const callback of this._listeners.get(event)) {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Erro ao processar ouvinte do evento "${event}":`, err);
      }
    }
  }

  clear() {
    this._listeners.clear();
  }
}

export const eventBus = new AppEventBus();
if (typeof window !== 'undefined') {
  window.AppEvents = eventBus;
}
