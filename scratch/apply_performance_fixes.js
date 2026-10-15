const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');
const isCRLF = content.includes('\r\n');
console.log('Original content length:', content.length, 'isCRLF:', isCRLF);

// Normalize to LF for manipulation
content = content.replace(/\r\n/g, '\n');

// Fix 1: PdfStorage._dbPromise and safe getDb
const oldPdfStorageGetDb = `      dbVersion: 2,
      db: null,

      async getDb() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(this.dbName, this.dbVersion);
          request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('files')) {
              db.createObjectStore('files', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('annotations')) {
              db.createObjectStore('annotations', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('bookmarks')) {
              db.createObjectStore('bookmarks', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('library_files')) {
              db.createObjectStore('library_files', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('library_metadata')) {
              db.createObjectStore('library_metadata', { keyPath: 'id' });
            }
          };
          request.onsuccess = (e) => {
            this.db = e.target.result;
            resolve(this.db);
          };
          request.onerror = (e) => {
            console.error('[PdfStorage] Erro ao abrir IndexedDB:', e);
            reject(e.target.error);
          };
        });
      },`;

const newPdfStorageGetDb = `      dbVersion: 2,
      db: null,
      _dbPromise: null,

      async getDb() {
        if (this.db) return this.db;
        if (this._dbPromise) return this._dbPromise;
        this._dbPromise = new Promise((resolve, reject) => {
          try {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onblocked = () => {
              console.warn('[PdfStorage] Abertura do IndexedDB aguardando liberação de conexões anteriores.');
            };
            request.onupgradeneeded = (e) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id' });
              }
              if (!db.objectStoreNames.contains('annotations')) {
                db.createObjectStore('annotations', { keyPath: 'id' });
              }
              if (!db.objectStoreNames.contains('bookmarks')) {
                db.createObjectStore('bookmarks', { keyPath: 'id' });
              }
              if (!db.objectStoreNames.contains('library_files')) {
                db.createObjectStore('library_files', { keyPath: 'id' });
              }
              if (!db.objectStoreNames.contains('library_metadata')) {
                db.createObjectStore('library_metadata', { keyPath: 'id' });
              }
            };
            request.onsuccess = (e) => {
              this.db = e.target.result;
              this.db.onversionchange = () => {
                if (this.db) {
                  this.db.close();
                  this.db = null;
                }
                this._dbPromise = null;
              };
              this._dbPromise = null;
              resolve(this.db);
            };
            request.onerror = (e) => {
              this._dbPromise = null;
              console.error('[PdfStorage] Erro ao abrir IndexedDB:', e);
              reject(e.target.error || new Error('Falha ao abrir IndexedDB'));
            };
          } catch (err) {
            this._dbPromise = null;
            reject(err);
          }
        });
        return this._dbPromise;
      },`;

if (!content.includes(oldPdfStorageGetDb)) {
  console.error('Fix 1 target not found!');
} else {
  content = content.replace(oldPdfStorageGetDb, newPdfStorageGetDb);
  console.log('Fix 1 applied: PdfStorage._dbPromise');
}

// Fix 2: SyncManager initialized guard
const oldSyncManagerInit = `const SyncManager = {
      client: null,
      user: null,`;

const newSyncManagerInit = `const SyncManager = {
      initialized: false,
      client: null,
      user: null,`;

if (!content.includes(oldSyncManagerInit)) {
  console.error('Fix 2 target 1 not found!');
} else {
  content = content.replace(oldSyncManagerInit, newSyncManagerInit);
  console.log('Fix 2.1 applied: SyncManager.initialized property');
}

const oldSyncInitBody = `      async init() {
        try {
          if (typeof supabase === 'undefined' || !supabase.createClient) {`;

const newSyncInitBody = `      async init() {
        if (this.initialized) return;
        this.initialized = true;
        try {
          if (typeof supabase === 'undefined' || !supabase.createClient) {`;

if (!content.includes(oldSyncInitBody)) {
  console.error('Fix 2 target 2 not found!');
} else {
  content = content.replace(oldSyncInitBody, newSyncInitBody);
  console.log('Fix 2.2 applied: SyncManager.init guard');
}

// Fix 3: saveToStorage triggerCloud parameter and applyCloudPayload saveLocal = false
const oldSaveToStorage = `      saveToStorage(immediate = false) {
        if (immediate) {
          if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
          }
          this._doSaveToStorage();
          return;
        }

        // ANTI-LAG: Debounce de 200ms para escrita em disco (evita 10 JSON.stringify a cada clique rápido)
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
          this._saveTimer = null;
          this._doSaveToStorage();
        }, 200);
      },

      _doSaveToStorage() {
        try {
          localStorage.setItem('concurso_app_data', JSON.stringify(this.data));
          localStorage.setItem('concurso_schedules_list', JSON.stringify(this.schedules));
          localStorage.setItem('concurso_active_schedule_id', this.activeScheduleId || '');
          localStorage.setItem('concurso_schedule_data', JSON.stringify(this.schedule));
          localStorage.setItem('concurso_completed_slots', JSON.stringify(this.completedSlots));

          // Persistência da Parte C
          localStorage.setItem('concurso_subject_priorities', JSON.stringify(this.priorities || {}));
          if (this.examDate) {
            localStorage.setItem('concurso_exam_target', JSON.stringify({ date: this.examDate, title: this.examTitle }));
          } else {
            localStorage.removeItem('concurso_exam_target');
          }
          localStorage.setItem('concurso_spaced_reviews', JSON.stringify(this.spacedReviews || []));
          localStorage.setItem('concurso_session_break_min', String(this.sessionBreakMin || 5));
          localStorage.setItem('concurso_weekly_review_config', JSON.stringify(this.weeklyReview || { enabled: false, day: 'Domingo' }));
          localStorage.setItem('concurso_study_log', JSON.stringify(this.studyLog || []));
        } catch (e) {
          console.error('Erro ao salvar no localStorage', e);
        }

        // Sincronização em nuvem automática (Parte C)
        if (typeof SyncManager !== 'undefined' && SyncManager.debouncedSync) {
          SyncManager.debouncedSync();
        }
      },`;

const newSaveToStorage = `      saveToStorage(immediate = false, triggerCloud = true) {
        if (immediate) {
          if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
          }
          this._doSaveToStorage(triggerCloud);
          return;
        }

        // ANTI-LAG: Debounce de 200ms para escrita em disco (evita 10 JSON.stringify a cada clique rápido)
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
          this._saveTimer = null;
          this._doSaveToStorage(triggerCloud);
        }, 200);
      },

      _doSaveToStorage(triggerCloud = true) {
        try {
          localStorage.setItem('concurso_app_data', JSON.stringify(this.data));
          localStorage.setItem('concurso_schedules_list', JSON.stringify(this.schedules));
          localStorage.setItem('concurso_active_schedule_id', this.activeScheduleId || '');
          localStorage.setItem('concurso_schedule_data', JSON.stringify(this.schedule));
          localStorage.setItem('concurso_completed_slots', JSON.stringify(this.completedSlots));

          // Persistência da Parte C
          localStorage.setItem('concurso_subject_priorities', JSON.stringify(this.priorities || {}));
          if (this.examDate) {
            localStorage.setItem('concurso_exam_target', JSON.stringify({ date: this.examDate, title: this.examTitle }));
          } else {
            localStorage.removeItem('concurso_exam_target');
          }
          localStorage.setItem('concurso_spaced_reviews', JSON.stringify(this.spacedReviews || []));
          localStorage.setItem('concurso_session_break_min', String(this.sessionBreakMin || 5));
          localStorage.setItem('concurso_weekly_review_config', JSON.stringify(this.weeklyReview || { enabled: false, day: 'Domingo' }));
          localStorage.setItem('concurso_study_log', JSON.stringify(this.studyLog || []));
        } catch (e) {
          console.error('Erro ao salvar no localStorage', e);
        }

        // Sincronização em nuvem automática (Parte C)
        if (triggerCloud && typeof SyncManager !== 'undefined' && SyncManager.debouncedSync) {
          SyncManager.debouncedSync();
        }
      },`;

if (!content.includes(oldSaveToStorage)) {
  console.error('Fix 3 target 1 not found!');
} else {
  content = content.replace(oldSaveToStorage, newSaveToStorage);
  console.log('Fix 3.1 applied: saveToStorage triggerCloud param');
}

const oldApplyCloudSave = `        if (saveLocal) {
          App.saveToStorage();
        }`;

const newApplyCloudSave = `        if (saveLocal) {
          App.saveToStorage(false, false); // Salva localmente SEM disparar re-upload em loop para a nuvem
        }`;

if (!content.includes(oldApplyCloudSave)) {
  console.error('Fix 3 target 2 not found!');
} else {
  content = content.replace(oldApplyCloudSave, newApplyCloudSave);
  console.log('Fix 3.2 applied: applyCloudPayload non-looping local save');
}

// Fix 4: Remove auto-migration and duplicate sync from runDeferredTasks
const oldDeferredTasks = `          // Migração automática v1.6.2 do divisor
          safeRun('Migração de Tópicos', () => {
            const migratedV162 = localStorage.getItem('concurso_v162_divisor_migrated');
            if (!migratedV162) {
              if (this.data.materias && this.data.materias.length > 0) {
                this.dividirMateriasSalvasPorNumeracao(true);
              }
              localStorage.setItem('concurso_v162_divisor_migrated', 'true');
            }
          });

          safeRun('Ouvintes de Atualização', () => this.initUpdateListeners());
          safeRun('Leitor de PDF', () => this.initPdfReader());

          // Checagem de atualizações sem bloquear tela
          safeRun('Checagem de Atualizações em Segundo Plano', () => {
            if (profiler) profiler.mark('update_check_start');
            this.checkUpdates(false);
            if (profiler) profiler.mark('update_check_end');
          });

          // Sincronização em nuvem em segundo plano com indicador discreto
          safeRun('Sincronização em Nuvem', () => {
            if (typeof SyncManager !== 'undefined' && SyncManager.init) {
              if (profiler) profiler.mark('sync_start');
              SyncManager.init();
              if (profiler) profiler.mark('sync_end');
            }
          });`;

const newDeferredTasks = `          safeRun('Ouvintes de Atualização', () => this.initUpdateListeners());
          safeRun('Leitor de PDF', () => this.initPdfReader());

          // Checagem de atualizações sem bloquear tela
          safeRun('Checagem de Atualizações em Segundo Plano', () => {
            if (profiler) profiler.mark('update_check_start');
            this.checkUpdates(false);
            if (profiler) profiler.mark('update_check_end');
          });

          // Sincronização em nuvem em segundo plano com indicador discreto (executa uma única vez)
          safeRun('Sincronização em Nuvem', () => {
            if (typeof SyncManager !== 'undefined' && SyncManager.init) {
              if (profiler) profiler.mark('sync_start');
              SyncManager.init();
              if (profiler) profiler.mark('sync_end');
            }
          });`;

if (!content.includes(oldDeferredTasks)) {
  console.error('Fix 4 target not found!');
} else {
  content = content.replace(oldDeferredTasks, newDeferredTasks);
  console.log('Fix 4 applied: Removed disruptive auto-migration and duplicate sync');
}

// Fix 5: Do NOT eager-load PDF on startup in initPdfReader
const oldInitPdfReader = `        // Restaura em segundo plano o último PDF aberto, se existir
        PdfStorage.getFile('active').then(rec => {
          if (rec && rec.data) {
            App.loadPdfFromBuffer(rec.data, rec.name || 'Último PDF Aberto', false, 'active');
          }
        }).catch(() => {});
      },`;

const newInitPdfReader = `        // Marca flag para restauração sob demanda somente se o usuário acessar a aba de Leitura
        this.pdfReader.hasPendingRestore = true;
      },`;

if (!content.includes(oldInitPdfReader)) {
  console.error('Fix 5 target 1 not found!');
} else {
  content = content.replace(oldInitPdfReader, newInitPdfReader);
  console.log('Fix 5.1 applied: Removed eager PDF parse on startup in initPdfReader');
}

// In switchTab, load pending PDF only when tab-pdf-reader is active
const oldSwitchTabPdf = `        if (tabId === 'tab-library') {
          if (typeof LibraryManager !== 'undefined' && LibraryManager.refresh) {
            LibraryManager.refresh();
          }
        }`;

const newSwitchTabPdf = `        if (tabId === 'tab-library') {
          if (typeof LibraryManager !== 'undefined' && LibraryManager.refresh) {
            LibraryManager.refresh();
          }
        }

        if (tabId === 'tab-pdf-reader') {
          if (this.pdfReader.hasPendingRestore && !this.pdfReader.doc) {
            this.pdfReader.hasPendingRestore = false;
            PdfStorage.getFile('active').then(rec => {
              if (rec && rec.data) {
                App.loadPdfFromBuffer(rec.data, rec.name || 'Último PDF Aberto', false, 'active');
              }
            }).catch(() => {});
          }
        }`;

if (!content.includes(oldSwitchTabPdf)) {
  console.error('Fix 5 target 2 not found!');
} else {
  content = content.replace(oldSwitchTabPdf, newSwitchTabPdf);
  console.log('Fix 5.2 applied: On-demand PDF load when opening tab-pdf-reader');
}

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync('index.html', content, 'utf8');
console.log('Successfully updated index.html! New length:', content.length);
