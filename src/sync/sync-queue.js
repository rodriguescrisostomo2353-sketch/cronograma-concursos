/**
 * Módulo de Fila de Sincronização Offline e Estado de Conexão
 * Gerencia operações pendentes quando o aparelho estiver sem internet ou no modo offline forçado.
 */

import { eventBus } from '../core/events.js';

export const QUEUE_STORAGE_KEY = 'concurso_offline_mutation_queue';
export const FORCE_OFFLINE_KEY = 'concurso_force_offline';

export class SyncQueue {
  constructor() {
    this.queue = this._loadQueue();
    this.forceOffline = this._loadForceOffline();
    this._setupNetworkListeners();
  }

  _loadQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _persistQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (err) {
      console.error('[SyncQueue] Erro ao persistir fila:', err);
    }
  }

  _loadForceOffline() {
    try {
      return localStorage.getItem(FORCE_OFFLINE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  _setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        eventBus.emit('network:online', { isOnline: true });
        if (!this.forceOffline) {
          this.flush();
        }
      });

      window.addEventListener('offline', () => {
        eventBus.emit('network:offline', { isOnline: false });
      });
    }
  }

  isOffline() {
    if (this.forceOffline) return true;
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  }

  setForceOffline(enabled) {
    this.forceOffline = Boolean(enabled);
    try {
      localStorage.setItem(FORCE_OFFLINE_KEY, String(this.forceOffline));
    } catch {}
    eventBus.emit('sync:forceOffline', this.forceOffline);
    if (!this.forceOffline && !this.isOffline()) {
      this.flush();
    }
  }

  enqueue(type = 'mutation', description = '', payload = null) {
    const item = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      description,
      payload,
      timestamp: Date.now()
    };
    this.queue.push(item);
    this._persistQueue();
    eventBus.emit('sync:queued', item);
    return item;
  }

  getPendingItems() {
    return [...this.queue];
  }

  getPendingCount() {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
    this._persistQueue();
    eventBus.emit('sync:cleared');
  }

  async flush(executorFn = null) {
    if (this.queue.length === 0 || this.isOffline()) return false;

    eventBus.emit('sync:flushing', { count: this.queue.length });

    if (typeof executorFn === 'function') {
      try {
        const success = await executorFn([...this.queue]);
        if (success) {
          this.clear();
          eventBus.emit('sync:flushed', { success: true });
          return true;
        }
      } catch (err) {
        console.error('[SyncQueue] Erro ao descarregar fila:', err);
        eventBus.emit('sync:error', err);
        return false;
      }
    } else if (typeof window !== 'undefined' && window.SyncManager && typeof window.SyncManager.flushOfflineQueue === 'function') {
      return window.SyncManager.flushOfflineQueue();
    }
    return false;
  }
}

export const syncQueue = new SyncQueue();
if (typeof window !== 'undefined') {
  window.SyncQueue = syncQueue;
}
