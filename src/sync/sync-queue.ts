/**
 * Módulo de Fila de Sincronização Offline e Estado de Conexão em TypeScript
 * Gerencia operações pendentes quando o aparelho estiver sem internet ou no modo offline forçado.
 */

import { eventBus } from '../core/events';

export const QUEUE_STORAGE_KEY = 'concurso_offline_mutation_queue';
export const FORCE_OFFLINE_KEY = 'concurso_force_offline';

export interface QueueItem {
  id: string;
  type: string;
  description: string;
  payload: any;
  timestamp: number;
}

export class SyncQueue {
  public queue: QueueItem[];
  public forceOffline: boolean;

  constructor() {
    this.queue = this._loadQueue();
    this.forceOffline = this._loadForceOffline();
    this._setupNetworkListeners();
  }

  private _loadQueue(): QueueItem[] {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private _persistQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (err) {
      console.error('[SyncQueue] Erro ao persistir fila:', err);
    }
  }

  private _loadForceOffline(): boolean {
    try {
      return localStorage.getItem(FORCE_OFFLINE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private _setupNetworkListeners(): void {
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

  public isOffline(): boolean {
    if (this.forceOffline) return true;
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  }

  public setForceOffline(enabled: boolean): void {
    this.forceOffline = Boolean(enabled);
    try {
      localStorage.setItem(FORCE_OFFLINE_KEY, String(this.forceOffline));
    } catch {}
    eventBus.emit('sync:forceOffline', this.forceOffline);
    if (!this.forceOffline && !this.isOffline()) {
      this.flush();
    }
  }

  public enqueue(type: string = 'mutation', description: string = '', payload: any = null): QueueItem {
    const item: QueueItem = {
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

  public getPendingItems(): QueueItem[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
    this._persistQueue();
    eventBus.emit('sync:cleared');
  }

  public async flush(executorFn: ((items: QueueItem[]) => Promise<boolean>) | null = null): Promise<boolean> {
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
    } else if (typeof window !== 'undefined' && (window as any).SyncManager && typeof (window as any).SyncManager.flushOfflineQueue === 'function') {
      return (window as any).SyncManager.flushOfflineQueue();
    }
    return false;
  }
}

export const syncQueue = new SyncQueue();

declare global {
  interface Window {
    SyncQueue?: SyncQueue;
  }
}

if (typeof window !== 'undefined') {
  window.SyncQueue = syncQueue;
}
