const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. ADD METHODS TO PdfStorage
const pdfStorageEndTarget = `          if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
            const tx = db.transaction('bookmarks', 'readwrite');
            const store = tx.objectStore('bookmarks');
            data.bookmarks.forEach(item => {
              if (item && item.id) store.put(item);
            });
          }
        } catch (e) {
          console.warn('[PdfStorage] Erro ao importar anotações/favoritos:', e);
        }
      }
    };`;

const pdfStorageReplacement = `          if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
            const tx = db.transaction('bookmarks', 'readwrite');
            const store = tx.objectStore('bookmarks');
            data.bookmarks.forEach(item => {
              if (item && item.id) store.put(item);
            });
          }
        } catch (e) {
          console.warn('[PdfStorage] Erro ao importar anotações/favoritos:', e);
        }
      },

      /* =========================================================================
         MÉTODOS DA BIBLIOTECA VIRTUAL (ARQUIVOS & METADADOS EM INDEXEDDB)
         ========================================================================= */
      async saveLibraryFile(id, buffer, meta) {
        try {
          const db = await this.getDb();
          return new Promise((resolve, reject) => {
            const tx = db.transaction(['files', 'library_metadata'], 'readwrite');
            tx.objectStore('files').put({ id, name: meta.name, data: buffer, updatedAt: Date.now() });
            tx.objectStore('library_metadata').put({ ...meta, id, updatedAt: Date.now() });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
          });
        } catch (err) {
          console.warn('[PdfStorage] Erro ao salvar arquivo na biblioteca:', err);
          return false;
        }
      },

      async getAllLibraryMetadata() {
        try {
          const db = await this.getDb();
          return new Promise((resolve) => {
            if (!db.objectStoreNames.contains('library_metadata')) return resolve([]);
            const tx = db.transaction('library_metadata', 'readonly');
            const req = tx.objectStore('library_metadata').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          });
        } catch (err) {
          return [];
        }
      },

      async getLibraryFileWithBuffer(id) {
        try {
          const db = await this.getDb();
          const metaPromise = new Promise((resolve) => {
            if (!db.objectStoreNames.contains('library_metadata')) return resolve(null);
            const tx = db.transaction('library_metadata', 'readonly');
            const req = tx.objectStore('library_metadata').get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          });
          const filePromise = this.getFile(id);
          const [meta, file] = await Promise.all([metaPromise, filePromise]);
          if (!file) return null;
          return {
            ...(meta || {}),
            id,
            name: (meta && meta.name) || file.name || 'Arquivo',
            data: file.data
          };
        } catch (err) {
          console.warn('[PdfStorage] Erro ao buscar arquivo com buffer:', err);
          return null;
        }
      },

      async deleteLibraryFile(id) {
        try {
          const db = await this.getDb();
          return new Promise((resolve) => {
            const stores = ['files'];
            if (db.objectStoreNames.contains('library_metadata')) stores.push('library_metadata');
            const tx = db.transaction(stores, 'readwrite');
            tx.objectStore('files').delete(id);
            if (db.objectStoreNames.contains('library_metadata')) {
              tx.objectStore('library_metadata').delete(id);
            }
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          });
        } catch (err) {
          return false;
        }
      },

      async updateLibraryMetadata(id, updates) {
        try {
          const db = await this.getDb();
          return new Promise((resolve) => {
            if (!db.objectStoreNames.contains('library_metadata')) return resolve(false);
            const tx = db.transaction('library_metadata', 'readwrite');
            const store = tx.objectStore('library_metadata');
            const req = store.get(id);
            req.onsuccess = () => {
              const item = req.result;
              if (!item) return resolve(false);
              const updated = { ...item, ...updates, updatedAt: Date.now() };
              store.put(updated);
              resolve(true);
            };
            req.onerror = () => resolve(false);
          });
        } catch (err) {
          return false;
        }
      }
    };`;

if (content.includes(pdfStorageEndTarget)) {
  content = content.replace(pdfStorageEndTarget, pdfStorageReplacement);
  console.log('SUCCESS: PdfStorage library methods successfully added.');
} else {
  console.error('ERROR: pdfStorageEndTarget still not found!');
}

// 2. ENHANCE SyncManager: Add forceOffline, offlineQueue, isOffline(), toggleForceOffline(), recordOfflineMutation(), flushOfflineQueue()
const syncManagerPropsTarget = `      debounceTimer: null,
      isSyncing: false,
      hasPendingSync: false,
      pendingCloudData: null,`;

const syncManagerPropsReplacement = `      debounceTimer: null,
      isSyncing: false,
      hasPendingSync: false,
      pendingCloudData: null,
      forceOffline: (function() {
        try { return localStorage.getItem('concurso_force_offline') === 'true'; } catch(e) { return false; }
      })(),
      offlineQueue: (function() {
        try { return JSON.parse(localStorage.getItem('concurso_offline_mutation_queue') || '[]'); } catch(e) { return []; }
      })(),

      isOffline() {
        return this.forceOffline || (typeof navigator !== 'undefined' && !navigator.onLine);
      },

      toggleForceOffline(forced) {
        this.forceOffline = !!forced;
        try {
          localStorage.setItem('concurso_force_offline', String(this.forceOffline));
        } catch(e) {}
        this.updateDiagnosticsUI();
        if (this.forceOffline) {
          this.setSyncStatus('offline', 'Modo Offline Forçado');
          App.showToast('📴 Modo offline ativado. Todas as alterações serão salvas localmente.', 'info');
        } else {
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            this.setSyncStatus(this.user ? 'synced' : 'local', this.user ? 'Online (Sincronizado)' : 'Online (Local)');
            App.showToast('🌐 Conexão online ativa!', 'success');
            if (this.offlineQueue.length > 0) {
              this.flushOfflineQueue();
            }
          } else {
            this.setSyncStatus('offline', 'Offline (Sem Conexão)');
          }
        }
      },

      recordOfflineMutation(type, desc) {
        const mutation = {
          id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          type: type || 'save_state',
          desc: desc || 'Alteração salva offline',
          timestamp: Date.now()
        };
        this.offlineQueue.push(mutation);
        if (this.offlineQueue.length > 100) this.offlineQueue.shift();
        try {
          localStorage.setItem('concurso_offline_mutation_queue', JSON.stringify(this.offlineQueue));
        } catch(e) {}
        this.updateDiagnosticsUI();
      },

      async flushOfflineQueue() {
        if (this.isOffline()) {
          App.showToast('Você está no modo offline. Desative o modo offline nos Ajustes para sincronizar.', 'warning');
          return;
        }
        if (!this.user || !this.client) {
          this.offlineQueue = [];
          try { localStorage.removeItem('concurso_offline_mutation_queue'); } catch(e) {}
          this.updateDiagnosticsUI();
          App.showToast('Dados locais preservados no navegador.', 'info');
          return;
        }
        try {
          const count = this.offlineQueue.length;
          this.setSyncStatus('syncing', 'Sincronizando...');
          await this.syncUp();
          this.offlineQueue = [];
          try { localStorage.removeItem('concurso_offline_mutation_queue'); } catch(e) {}
          this.updateDiagnosticsUI();
          App.showToast(\`✅ Sincronização concluída: \${count > 0 ? count + ' alterações enviadas' : 'dados atualizados'}!\`, 'success');
        } catch(err) {
          console.warn('[SyncManager] Erro ao descarregar fila offline:', err);
          this.setSyncStatus('offline', 'Falha ao sincronizar');
        }
      },`;

if (content.includes(syncManagerPropsTarget)) {
  content = content.replace(syncManagerPropsTarget, syncManagerPropsReplacement);
  console.log('SUCCESS: SyncManager offline props & queue methods added.');
} else {
  console.error('ERROR: syncManagerPropsTarget not found!');
}

// 3. UPDATE debouncedSync in SyncManager to handle offline queue
const oldDebouncedSyncTarget = `      debouncedSync() {
        if (!this.user || !this.client) return;

        if (!navigator.onLine) {
          this.hasPendingSync = true;
          this.setSyncStatus('local', 'Offline (pendente)');
          return;
        }

        this.setSyncStatus('syncing', 'Sincronizando...');
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
          this.syncUp();
        }, 1500);
      },`;

const newDebouncedSyncReplacement = `      debouncedSync() {
        if (this.isOffline()) {
          this.hasPendingSync = true;
          this.recordOfflineMutation('save_state', 'Alteração salva offline');
          const pending = (this.offlineQueue || []).length;
          this.setSyncStatus('offline', \`Offline (\${pending} pendência\${pending === 1 ? '' : 's'})\`);
          return;
        }

        if (!this.user || !this.client) return;

        this.setSyncStatus('syncing', 'Sincronizando...');
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
          this.syncUp();
        }, 1200);
      },`;

if (content.includes(oldDebouncedSyncTarget)) {
  content = content.replace(oldDebouncedSyncTarget, newDebouncedSyncReplacement);
  console.log('SUCCESS: SyncManager debouncedSync updated.');
} else {
  console.error('ERROR: oldDebouncedSyncTarget not found!');
}

// Restore line endings if needed
if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('index.html fully patched with PdfStorage and SyncManager offline queue!');
