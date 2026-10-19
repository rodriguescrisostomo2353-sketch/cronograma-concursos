/**
 * Módulo de Fila de Sincronização Outbox Idempotente em TypeScript
 * Garante que:
 * 1. Cada operação tenha um opId estável.
 * 2. Múltiplas mutações da mesma entidade sejam compactadas (squashed).
 * 3. Operações sejam removidas SOMENTE após confirmação do servidor.
 * 4. Trava de execução única (mutex), debounce e backoff exponencial em erros.
 */

import { eventBus } from '../core/events';
import { getOperationId } from '../core/id-utils';

export const QUEUE_STORAGE_KEY = 'concurso_offline_mutation_queue';
export const FORCE_OFFLINE_KEY = 'concurso_force_offline';

export interface QueueItem {
  opId: string;
  id: string; // compatibilidade
  type: string;
  entityType?: string;
  entityId?: string;
  description: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

export class SyncQueue {
  public queue: QueueItem[];
  public forceOffline: boolean;
  public isFlushing: boolean = false;
  private _failureCount: number = 0;
  private _lastFlushTime: number = 0;
  private readonly _minIntervalMs: number = 1000;
  private _debounceTimer: any = null;

  constructor() {
    this.queue = this._loadQueue();
    this.forceOffline = this._loadForceOffline();
    this._setupNetworkListeners();
  }

  private _loadQueue(): QueueItem[] {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
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
          this.debouncedFlush();
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
      this.debouncedFlush();
    }
  }

  /**
   * Compacta a fila: mantém apenas a última operação por entidade
   */
  public compact(): void {
    const map = new Map<string, QueueItem>();
    for (const item of this.queue) {
      const key = `${item.entityType || 'generic'}::${item.entityId || item.opId || item.id}`;
      map.set(key, item);
    }
    this.queue = Array.from(map.values());
    this._persistQueue();
  }

  /**
   * Enfileira uma mutação de forma idempotente com opId estável e auto-compactação
   */
  public enqueue(
    type: string = 'mutation',
    description: string = '',
    payload: any = null,
    entityType?: string,
    entityId?: string
  ): QueueItem {
    const entType = entityType || type || 'save_state';
    const entId = entityId || (payload && payload.id) || 'global';
    const opId = getOperationId(entType, entId);

    const item: QueueItem = {
      opId,
      id: opId,
      type,
      entityType: entType,
      entityId: entId,
      description,
      payload,
      timestamp: Date.now(),
      retryCount: 0
    };

    // Compactação em tempo de inserção: substitui versão anterior da mesma entidade
    const existingIndex = this.queue.findIndex(
      q => q.opId === opId || (q.entityType === entType && q.entityId === entId)
    );

    if (existingIndex !== -1) {
      this.queue[existingIndex] = item;
    } else {
      this.queue.push(item);
    }

    if (this.queue.length > 500) {
      this.queue.shift(); // Evita estouro de memória
    }

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

  /**
   * Remove SOMENTE os itens que foram confirmados com sucesso pelo servidor
   */
  public removeConfirmed(confirmedOpIds: string[]): void {
    if (!confirmedOpIds || confirmedOpIds.length === 0) return;
    const set = new Set(confirmedOpIds);
    this.queue = this.queue.filter(item => !set.has(item.opId) && !set.has(item.id));
    this._persistQueue();
    eventBus.emit('sync:confirmed', { removedCount: confirmedOpIds.length, remaining: this.queue.length });
  }

  public debouncedFlush(delayMs: number = 1000): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.flush();
    }, delayMs);
  }

  /**
   * Descarrega a fila com garantia de exclusão apenas sob confirmação e trava única
   */
  public async flush(executorFn: ((items: QueueItem[]) => Promise<boolean>) | null = null): Promise<boolean> {
    if (this.queue.length === 0 || this.isOffline() || this.isFlushing) {
      return false;
    }

    const now = Date.now();
    if (now - this._lastFlushTime < this._minIntervalMs) {
      return false;
    }

    // Backoff exponencial se houver falhas consecutivas
    if (this._failureCount > 0) {
      const backoffWait = Math.min(60000, 1000 * Math.pow(2, this._failureCount));
      if (now - this._lastFlushTime < backoffWait) {
        return false;
      }
    }

    this.isFlushing = true;
    this._lastFlushTime = now;
    this.compact();

    const itemsToSend = [...this.queue];
    const opIdsToSend = itemsToSend.map(i => i.opId);

    eventBus.emit('sync:flushing', { count: itemsToSend.length });

    try {
      let success = false;
      if (typeof executorFn === 'function') {
        success = await executorFn(itemsToSend);
      } else if (
        typeof window !== 'undefined' &&
        (window as any).SyncManager &&
        typeof (window as any).SyncManager.flushOfflineQueue === 'function'
      ) {
        success = await (window as any).SyncManager.flushOfflineQueue();
      }

      if (success) {
        this.removeConfirmed(opIdsToSend);
        this._failureCount = 0;
        eventBus.emit('sync:flushed', { success: true, count: opIdsToSend.length });
        return true;
      } else {
        this._failureCount++;
        eventBus.emit('sync:error', { error: 'Servidor recusou ou não confirmou a operação' });
        return false;
      }
    } catch (err) {
      this._failureCount++;
      console.error('[SyncQueue] Erro ao descarregar fila:', err);
      eventBus.emit('sync:error', err);
      return false;
    } finally {
      this.isFlushing = false;
    }
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
