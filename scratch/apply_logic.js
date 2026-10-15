const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF for editing
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// =========================================================================
// 1. UPGRADE PdfStorage: dbVersion 2, library_files, library_metadata
// =========================================================================
const oldPdfStorageStart = `    const PdfStorage = {
      dbName: 'ConcursoPdfReaderDB',
      dbVersion: 1,
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
          };`;

const newPdfStorageStart = `    const PdfStorage = {
      dbName: 'ConcursoPdfReaderDB',
      dbVersion: 2,
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
          };`;

if (content.includes(oldPdfStorageStart)) {
  content = content.replace(oldPdfStorageStart, newPdfStorageStart);
  console.log('PdfStorage dbVersion 2 upgrade applied.');
} else {
  console.warn('PdfStorage start marker not matched directly, checking...');
}

// Add library helper methods to PdfStorage before the end of PdfStorage
const pdfStorageEndTarget = `          if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
            const tx = db.transaction('bookmarks', 'readwrite');
            const store = tx.objectStore('bookmarks');
            data.bookmarks.forEach(item => {
              if (item && item.id) store.put(item);
            });
          }
        } catch (e) {}
      }
    };`;

const pdfStorageAdditionalMethods = `          if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
            const tx = db.transaction('bookmarks', 'readwrite');
            const store = tx.objectStore('bookmarks');
            data.bookmarks.forEach(item => {
              if (item && item.id) store.put(item);
            });
          }
        } catch (e) {}
      },

      /* MÉTODOS DA BIBLIOTECA VIRTUAL (ARQUIVOS & METADADOS) */
      async saveLibraryFile(id, buffer, meta) {
        try {
          const db = await this.getDb();
          return new Promise((resolve, reject) => {
            const tx = db.transaction(['library_files', 'library_metadata'], 'readwrite');
            tx.objectStore('library_files').put({ id, name: meta.name, data: buffer, updatedAt: Date.now() });
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
          const filePromise = new Promise((resolve) => {
            if (!db.objectStoreNames.contains('library_files')) return resolve(null);
            const tx = db.transaction('library_files', 'readonly');
            const req = tx.objectStore('library_files').get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          });
          const [meta, file] = await Promise.all([metaPromise, filePromise]);
          if (!file) {
            // Tenta fallback para o store 'files' legado
            const legacyFile = await this.getFile(id);
            if (!legacyFile) return null;
            return { ...(meta || {}), id, name: (meta && meta.name) || legacyFile.name || 'Arquivo', data: legacyFile.data };
          }
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
            const stores = [];
            if (db.objectStoreNames.contains('library_files')) stores.push('library_files');
            if (db.objectStoreNames.contains('library_metadata')) stores.push('library_metadata');
            if (stores.length === 0) return resolve(true);
            const tx = db.transaction(stores, 'readwrite');
            if (db.objectStoreNames.contains('library_files')) tx.objectStore('library_files').delete(id);
            if (db.objectStoreNames.contains('library_metadata')) tx.objectStore('library_metadata').delete(id);
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
  content = content.replace(pdfStorageEndTarget, pdfStorageAdditionalMethods);
  console.log('PdfStorage library methods added.');
} else {
  console.warn('PdfStorage end target not found.');
}

// =========================================================================
// 2. ADICIONAR O OBJETO LibraryManager
// =========================================================================
const libraryManagerJs = `
    /**
     * =========================================================================
     * GERENCIADOR DA BIBLIOTECA VIRTUAL DE ARQUIVOS (PDFs, APOSTILAS, RESUMOS)
     * =========================================================================
     */
    const LibraryManager = {
      files: [],
      searchQuery: '',
      filterSubject: 'all',
      filterCategory: 'all',
      sortBy: 'date_desc',

      async init() {
        this.bindEvents();
        await this.refresh();
      },

      bindEvents() {
        const searchInput = document.getElementById('librarySearchInput');
        if (searchInput) {
          searchInput.addEventListener('input', (e) => {
            this.searchQuery = (e.target.value || '').trim().toLowerCase();
            this.render();
          });
        }

        const subFilter = document.getElementById('librarySubjectFilter');
        if (subFilter) {
          subFilter.addEventListener('change', (e) => {
            this.filterSubject = e.target.value;
            this.render();
          });
        }

        const catFilter = document.getElementById('libraryCategoryFilter');
        if (catFilter) {
          catFilter.addEventListener('change', (e) => {
            this.filterCategory = e.target.value;
            this.render();
          });
        }

        const sortSel = document.getElementById('librarySortSelect');
        if (sortSel) {
          sortSel.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.render();
          });
        }

        const dropZone = document.getElementById('libraryDropZone');
        const fileInput = document.getElementById('libraryFileInput');
        if (dropZone && fileInput) {
          dropZone.addEventListener('click', () => fileInput.click());
          dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
          });
          dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
          dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const dtFiles = e.dataTransfer && e.dataTransfer.files;
            if (dtFiles && dtFiles.length > 0) {
              this.handleBatchFiles(dtFiles);
            }
          });
          fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              this.handleBatchFiles(files);
            }
          });
        }
      },

      populateSubjectFilter() {
        const subFilter = document.getElementById('librarySubjectFilter');
        const modalSubSelect = document.getElementById('modalLibrarySubjectSelect');
        const modalEditSubSelect = document.getElementById('modalLibraryEditSubject');

        const materias = (App.data && App.data.materias) || [];
        const optionsHtml = ['<option value="all">📚 Todas as Matérias</option>', '<option value="general">Geral / Sem Matéria</option>']
          .concat(materias.map(m => \`<option value="\${m.id}">\${App.escapeHtml(nomeMateria(m))}</option>\`))
          .join('');

        const modalOptions = ['<option value="">Geral / Sem Matéria</option>']
          .concat(materias.map(m => \`<option value="\${m.id}">\${App.escapeHtml(nomeMateria(m))}</option>\`))
          .join('');

        if (subFilter) subFilter.innerHTML = optionsHtml;
        if (modalSubSelect) modalSubSelect.innerHTML = modalOptions;
        if (modalEditSubSelect) modalEditSubSelect.innerHTML = modalOptions;
      },

      async refresh() {
        this.populateSubjectFilter();
        this.files = await PdfStorage.getAllLibraryMetadata();

        // Se ainda não temos o edital listado na biblioteca mas temos o edital salvo no IndexedDB, adiciona automaticamente
        const hasEditalInLib = this.files.some(f => f.category === 'edital' || f.id === 'edital');
        if (!hasEditalInLib) {
          const editalFile = await PdfStorage.getFile('edital');
          if (editalFile && editalFile.data) {
            const meta = {
              id: 'edital',
              name: editalFile.name || 'Edital do Concurso',
              originalName: editalFile.name || 'edital.pdf',
              size: editalFile.data.byteLength || (editalFile.data.length || 0),
              type: 'application/pdf',
              subjectId: '',
              subjectName: 'Edital Oficial',
              category: 'edital',
              notes: 'Edital processado automaticamente pelo sistema.',
              totalPages: editalFile.totalPages || 0,
              createdAt: Date.now(),
              updatedAt: editalFile.updatedAt || Date.now()
            };
            await PdfStorage.saveLibraryFile('edital', editalFile.data, meta);
            this.files.unshift(meta);
          }
        }

        this.render();
        this.updateStats();
      },

      updateStats() {
        const count = this.files.length;
        const totalBytes = this.files.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
        const countPill = document.getElementById('libraryCountPill');
        const sizePill = document.getElementById('librarySizePill');
        const badgeCount = document.getElementById('badgeLibraryCount');
        const sheetBadge = document.getElementById('sheetBadgeLibrary');

        if (countPill) countPill.textContent = \`\${count} arquivo\${count === 1 ? '' : 's'}\`;
        if (sizePill) sizePill.textContent = this.formatBytes(totalBytes);
        if (badgeCount) {
          badgeCount.textContent = count;
          badgeCount.style.display = count > 0 ? 'inline-block' : 'none';
        }
        if (sheetBadge) {
          sheetBadge.textContent = count;
          sheetBadge.style.display = count > 0 ? 'inline-block' : 'none';
        }
      },

      render() {
        const grid = document.getElementById('libraryFilesGrid');
        const emptyState = document.getElementById('libraryEmptyState');
        if (!grid) return;

        let filtered = [...this.files];

        // Filtro de Busca
        if (this.searchQuery) {
          filtered = filtered.filter(f => {
            const name = (f.name || '').toLowerCase();
            const notes = (f.notes || '').toLowerCase();
            const sub = (f.subjectName || '').toLowerCase();
            return name.includes(this.searchQuery) || notes.includes(this.searchQuery) || sub.includes(this.searchQuery);
          });
        }

        // Filtro por Matéria
        if (this.filterSubject !== 'all') {
          if (this.filterSubject === 'general') {
            filtered = filtered.filter(f => !f.subjectId);
          } else {
            filtered = filtered.filter(f => f.subjectId === this.filterSubject);
          }
        }

        // Filtro por Categoria
        if (this.filterCategory !== 'all') {
          filtered = filtered.filter(f => f.category === this.filterCategory);
        }

        // Ordenação
        if (this.sortBy === 'date_desc') {
          filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        } else if (this.sortBy === 'date_asc') {
          filtered.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
        } else if (this.sortBy === 'name_asc') {
          filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (this.sortBy === 'size_desc') {
          filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
        }

        if (filtered.length === 0) {
          grid.innerHTML = '';
          if (emptyState) emptyState.style.display = 'block';
          return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const materias = (App.data && App.data.materias) || [];
        const fragment = document.createDocumentFragment();

        filtered.forEach(file => {
          const card = document.createElement('div');
          card.className = 'library-card';

          const mat = materias.find(m => m.id === file.subjectId);
          const pal = mat ? App.getPalette(mat.paletteId) : null;
          const subjectPillStyle = pal 
            ? \`background: \${pal.bg}; color: \${pal.text}; border: 1px solid \${pal.border};\`
            : 'background: var(--bg-subtle); color: var(--text-muted); border: 1px solid var(--border-color);';

          const catLabel = this.getCategoryLabel(file.category);
          const catClass = this.getCategoryClass(file.category);

          card.innerHTML = \`
            <div>
              <div class="library-card-header">
                <div class="library-card-icon \${catClass}">
                  \${this.getCategoryIcon(file.category)}
                </div>
                <div class="library-card-title-area">
                  <h4 class="library-card-title" title="\${App.escapeHtml(file.name)}">\${App.escapeHtml(file.name)}</h4>
                  <div class="library-card-badges">
                    <span class="library-badge-cat">\${catLabel}</span>
                    <span class="library-badge-subject" style="\${subjectPillStyle}">
                      \${App.escapeHtml(mat ? nomeMateria(mat) : (file.subjectName || 'Geral'))}
                    </span>
                  </div>
                </div>
              </div>

              <div class="library-card-meta">
                <span>💾 \${this.formatBytes(file.size)}</span>
                <span>📅 \${this.formatDate(file.updatedAt || file.createdAt)}</span>
                \${file.totalPages ? \`<span>📄 \${file.totalPages} pág\${file.totalPages === 1 ? '' : 's'}</span>\` : ''}
              </div>

              \${file.notes ? \`<div class="library-card-notes">\${App.escapeHtml(file.notes)}</div>\` : ''}
            </div>

            <div class="library-card-actions">
              <button type="button" class="btn btn-primary btn-sm" onclick="LibraryManager.openInReader('\${file.id}')" title="Abrir e ler no Leitor de PDF do App">
                📖 Ler no App
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="LibraryManager.exportFile('\${file.id}')" title="Baixar / Exportar arquivo original">
                ⬇️ Exportar
              </button>
              <button type="button" class="btn-icon" onclick="LibraryManager.openEditModal('\${file.id}')" title="Editar informações">
                ✏️
              </button>
              <button type="button" class="btn-icon danger" onclick="LibraryManager.deleteFile('\${file.id}')" title="Excluir arquivo da biblioteca">
                🗑️
              </button>
            </div>
          \`;

          fragment.appendChild(card);
        });

        grid.innerHTML = '';
        grid.appendChild(fragment);
      },

      async handleBatchFiles(files) {
        let added = 0;
        for (const file of Array.from(files)) {
          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const buffer = await file.arrayBuffer();
            const id = 'lib_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const isEdital = file.name.toLowerCase().includes('edital');
            const meta = {
              id,
              name: file.name.replace(/\\.pdf$/i, ''),
              originalName: file.name,
              size: file.size,
              type: file.type || 'application/pdf',
              subjectId: '',
              subjectName: isEdital ? 'Edital Oficial' : 'Geral',
              category: isEdital ? 'edital' : 'apostila',
              notes: '',
              totalPages: 0,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            await PdfStorage.saveLibraryFile(id, buffer, meta);
            added++;
          }
        }
        if (added > 0) {
          await this.refresh();
          App.showToast(\`\${added} arquivo\${added === 1 ? '' : 's'} adicionado\${added === 1 ? '' : 's'} à Biblioteca!\`, 'success');
        } else {
          App.showToast('Por favor, selecione arquivos em formato PDF.', 'warning');
        }
      },

      openUploadModal() {
        this.populateSubjectFilter();
        const modal = document.getElementById('modalLibraryUpload');
        const form = document.getElementById('formLibraryUpload');
        if (form) form.reset();
        if (modal) {
          modal.classList.remove('hidden');
          modal.classList.add('open');
        }
      },

      closeUploadModal() {
        const modal = document.getElementById('modalLibraryUpload');
        if (modal) {
          modal.classList.remove('open');
          modal.classList.add('hidden');
        }
      },

      async submitUploadModal(e) {
        e.preventDefault();
        const fileInput = document.getElementById('modalLibraryFileInput');
        const titleInput = document.getElementById('modalLibraryTitleInput');
        const subSelect = document.getElementById('modalLibrarySubjectSelect');
        const catSelect = document.getElementById('modalLibraryCategorySelect');
        const notesInput = document.getElementById('modalLibraryNotesInput');

        const file = fileInput && fileInput.files && fileInput.files[0];
        if (!file) {
          App.showToast('Por favor, selecione um arquivo PDF.', 'warning');
          return;
        }

        const buffer = await file.arrayBuffer();
        const id = 'lib_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const subId = subSelect ? subSelect.value : '';
        const materias = (App.data && App.data.materias) || [];
        const matchedMat = materias.find(m => m.id === subId);

        const meta = {
          id,
          name: (titleInput && titleInput.value.trim()) || file.name.replace(/\\.pdf$/i, ''),
          originalName: file.name,
          size: file.size,
          type: file.type || 'application/pdf',
          subjectId: subId,
          subjectName: matchedMat ? nomeMateria(matchedMat) : 'Geral',
          category: (catSelect && catSelect.value) || 'apostila',
          notes: (notesInput && notesInput.value.trim()) || '',
          totalPages: 0,
          createdAt: Date.now>,
          updatedAt: Date.now()
        };

        const saved = await PdfStorage.saveLibraryFile(id, buffer, meta);
        if (saved) {
          this.closeUploadModal();
          await this.refresh();
          App.showToast('Arquivo adicionado com sucesso à Biblioteca!', 'success');
        } else {
          App.showToast('Erro ao salvar arquivo no banco local.', 'warning');
        }
      },

      openEditModal(id) {
        const file = this.files.find(f => f.id === id);
        if (!file) return;
        this.populateSubjectFilter();

        const modal = document.getElementById('modalLibraryEdit');
        const idInput = document.getElementById('modalLibraryEditId');
        const titleInput = document.getElementById('modalLibraryEditTitle');
        const subSelect = document.getElementById('modalLibraryEditSubject');
        const catSelect = document.getElementById('modalLibraryEditCategory');
        const notesInput = document.getElementById('modalLibraryEditNotes');

        if (idInput) idInput.value = file.id;
        if (titleInput) titleInput.value = file.name || '';
        if (subSelect) subSelect.value = file.subjectId || '';
        if (catSelect) catSelect.value = file.category || 'apostila';
        if (notesInput) notesInput.value = file.notes || '';

        if (modal) {
          modal.classList.remove('hidden');
          modal.classList.add('open');
        }
      },

      closeEditModal() {
        const modal = document.getElementById('modalLibraryEdit');
        if (modal) {
          modal.classList.remove('open');
          modal.classList.add('hidden');
        }
      },

      async submitEditModal(e) {
        e.preventDefault();
        const idInput = document.getElementById('modalLibraryEditId');
        const titleInput = document.getElementById('modalLibraryEditTitle');
        const subSelect = document.getElementById('modalLibraryEditSubject');
        const catSelect = document.getElementById('modalLibraryEditCategory');
        const notesInput = document.getElementById('modalLibraryEditNotes');

        const id = idInput ? idInput.value : null;
        if (!id) return;

        const subId = subSelect ? subSelect.value : '';
        const materias = (App.data && App.data.materias) || [];
        const matchedMat = materias.find(m => m.id === subId);

        const updates = {
          name: (titleInput && titleInput.value.trim()) || 'Arquivo',
          subjectId: subId,
          subjectName: matchedMat ? nomeMateria(matchedMat) : 'Geral',
          category: (catSelect && catSelect.value) || 'apostila',
          notes: (notesInput && notesInput.value.trim()) || ''
        };

        await PdfStorage.updateLibraryMetadata(id, updates);
        this.closeEditModal();
        await this.refresh();
        App.showToast('Arquivo atualizado com sucesso!', 'success');
      },

      async openInReader(id) {
        const fileObj = await PdfStorage.getLibraryFileWithBuffer(id);
        if (!fileObj || !fileObj.data) {
          App.showToast('Arquivo não encontrado no armazenamento local.', 'warning');
          return;
        }

        // Salva cópia ativa no leitor e navega para a aba de leitura
        await App.loadPdfFromBuffer(fileObj.data, fileObj.name || 'Documento', true, id);
        App.switchTab('tab-pdf-reader');
        App.showToast(\`Lendo: \${fileObj.name}\`, 'info');
      },

      async exportFile(id) {
        const fileObj = await PdfStorage.getLibraryFileWithBuffer(id);
        if (!fileObj || !fileObj.data) {
          App.showToast('Arquivo não encontrado para download.', 'warning');
          return;
        }

        const blob = new Blob([fileObj.data], { type: fileObj.type || 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = (fileObj.name || 'documento').endsWith('.pdf') ? fileObj.name : \`\${fileObj.name}.pdf\`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2500);
        App.showToast(\`Download de "\${filename}" iniciado!\`, 'success');
      },

      async exportAllFiles() {
        if (this.files.length === 0) {
          App.showToast('Nenhum arquivo na biblioteca para exportar.', 'info');
          return;
        }

        App.showToast(\`Exportando \${this.files.length} arquivo(s) da biblioteca...\`, 'info');

        // Exporta cada arquivo sequencialmente para não sobrecarregar memória
        for (let i = 0; i < this.files.length; i++) {
          const f = this.files[i];
          await new Promise(r => setTimeout(r, 300));
          await this.exportFile(f.id);
        }
      },

      async deleteFile(id) {
        const file = this.files.find(f => f.id === id);
        const name = file ? file.name : 'este arquivo';
        if (!confirm(\`Deseja realmente excluir "\${name}" da sua biblioteca?\`)) return;

        await PdfStorage.deleteLibraryFile(id);
        await this.refresh();
        App.showToast('Arquivo excluído da biblioteca.', 'info');
      },

      formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 KB';
        const k = 1024;
        const dm = 1;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
      },

      formatDate(ts) {
        if (!ts) return 'Recente';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return 'Recente';
        return d.toLocaleDateString('pt-BR');
      },

      getCategoryLabel(cat) {
        const labels = {
          edital: '📑 Edital',
          apostila: '📘 Apostila',
          resumo: '📝 Resumo',
          questoes: '❓ Questões',
          legislacao: '⚖️ Legislação',
          outro: '📁 Outro'
        };
        return labels[cat] || '📘 Apostila';
      },

      getCategoryClass(cat) {
        return 'category-' + (cat || 'apostila');
      },

      getCategoryIcon(cat) {
        const icons = {
          edital: '📑',
          apostila: '📘',
          resumo: '📝',
          questoes: '❓',
          legislacao: '⚖️',
          outro: '📁'
        };
        return icons[cat] || '📄';
      }
    };
    window.LibraryManager = LibraryManager;
`;

// Insert LibraryManager right before LazyLoader
const lazyLoaderTarget = '    const LazyLoader = {';
if (content.includes(lazyLoaderTarget)) {
  content = content.replace(lazyLoaderTarget, libraryManagerJs + '\n\n' + lazyLoaderTarget);
  console.log('LibraryManager module injected.');
} else {
  console.warn('LazyLoader target not found.');
}

// =========================================================================
// 3. ENHANCE SyncManager: Offline Mode, Mutation Queue, Online/Offline detection
// =========================================================================
const oldSyncManagerStart = `    const SyncManager = {
      client: null,
      user: null,
      isSyncing: false,
      hasPendingSync: false,
      lastSyncTime: null,
      lastError: null,
      syncTimeout: null,
      pendingCloudData: null,`;

const newSyncManagerStart = `    const SyncManager = {
      client: null,
      user: null,
      isSyncing: false,
      hasPendingSync: false,
      lastSyncTime: null,
      lastError: null,
      syncTimeout: null,
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
            App.showToast('🌐 Modo online ativado!', 'success');
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
        if (this.offlineQueue.length > 100) this.offlineQueue.shift(); // Evita acúmulo infinito
        try {
          localStorage.setItem('concurso_offline_mutation_queue', JSON.stringify(this.offlineQueue));
        } catch(e) {}
        this.updateDiagnosticsUI();
      },

      async flushOfflineQueue() {
        if (this.isOffline()) {
          App.showToast('Você está no modo offline. Desative o modo offline para sincronizar.', 'warning');
          return;
        }
        if (!this.user || !this.client) {
          // Se não está logado, os dados já estão 100% seguros no localStorage/IndexedDB
          this.offlineQueue = [];
          try { localStorage.removeItem('concurso_offline_mutation_queue'); } catch(e) {}
          this.updateDiagnosticsUI();
          App.showToast('Dados locais atualizados com sucesso.', 'info');
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

if (content.includes(oldSyncManagerStart)) {
  content = content.replace(oldSyncManagerStart, newSyncManagerStart);
  console.log('SyncManager offline enhancements added.');
} else {
  console.warn('SyncManager start target not found.');
}

// Update SyncManager.setSyncStatus to handle offline pill & pending banner
const oldSetSyncStatus = `      setSyncStatus(status, text) {
        const dot = document.getElementById('headerSyncDot');
        const sheetDot = document.getElementById('sheetAuthDot');
        const badge = document.getElementById('settingsSyncBadge');
        const label = text || this.getStatusLabel(status);

        const targetClass = status === 'synced' ? 'mode-synced' :
                           status === 'syncing' ? 'mode-syncing' :
                           status === 'error' ? 'mode-error' : 'mode-local';

        if (dot) {
          dot.className = \`sync-dot \${targetClass}\`;
          dot.title = label;
        }
        if (sheetDot) {
          sheetDot.className = \`sync-dot \${targetClass}\`;
          sheetDot.title = label;
        }
        if (badge) {
          badge.innerHTML = \`<span class="sync-dot \${targetClass}"></span> <span>\${label}</span>\`;
        }
      },`;

const newSetSyncStatus = `      setSyncStatus(status, text) {
        const dot = document.getElementById('headerSyncDot');
        const sheetDot = document.getElementById('sheetAuthDot');
        const badge = document.getElementById('settingsSyncBadge');
        const label = text || this.getStatusLabel(status);

        const targetClass = status === 'synced' ? 'mode-synced' :
                           status === 'syncing' ? 'mode-syncing' :
                           status === 'error' ? 'mode-error' :
                           status === 'offline' ? 'mode-local' : 'mode-local';

        if (dot) {
          dot.className = \`sync-dot \${targetClass}\`;
          dot.title = label;
        }
        if (sheetDot) {
          sheetDot.className = \`sync-dot \${targetClass}\`;
          sheetDot.title = label;
        }
        if (badge) {
          badge.innerHTML = \`<span class="sync-dot \${targetClass}"></span> <span>\${label}</span>\`;
        }

        // Atualiza botão do Header
        const headerBtn = document.getElementById('btnHeaderAuth');
        if (headerBtn) {
          if (this.isOffline()) {
            const pending = (this.offlineQueue || []).length;
            headerBtn.title = pending > 0 ? \`Modo Offline (\${pending} pendência\${pending === 1 ? '' : 's'})\` : 'Modo Offline';
          } else {
            headerBtn.title = label;
          }
        }
      },`;

if (content.includes(oldSetSyncStatus)) {
  content = content.replace(oldSetSyncStatus, newSetSyncStatus);
  console.log('SyncManager.setSyncStatus updated.');
}

// Update debouncedSync to record offline mutation if offline
const oldDebouncedSync = `      debouncedSync() {
        if (!this.user || !this.client) return;
        this.hasPendingSync = true;
        this.setSyncStatus('local', 'Alterações pendentes');

        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
          this.syncUp();
        }, 1500);
      },`;

const newDebouncedSync = `      debouncedSync() {
        if (this.isOffline()) {
          this.hasPendingSync = true;
          this.recordOfflineMutation('save_state', 'Alteração salva localmente');
          const pending = (this.offlineQueue || []).length;
          this.setSyncStatus('offline', \`Offline (\${pending} pendência\${pending === 1 ? '' : 's'})\`);
          return;
        }
        if (!this.user || !this.client) return;
        this.hasPendingSync = true;
        this.setSyncStatus('local', 'Alterações pendentes');

        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
          this.syncUp();
        }, 1200);
      },`;

if (content.includes(oldDebouncedSync)) {
  content = content.replace(oldDebouncedSync, newDebouncedSync);
  console.log('SyncManager.debouncedSync updated for offline queue.');
}

// Update updateDiagnosticsUI to reflect offline queue and switch
const oldDiagSnippet = `        const pendingCountEl = document.getElementById('diagPendingItemsCount');
        if (pendingCountEl) {
          pendingCountEl.textContent = this.hasPendingSync ? '1 payload pendente para envio' : 'Nenhum item pendente';
        }`;

const newDiagSnippet = `        const pendingCountEl = document.getElementById('diagPendingItemsCount');
        if (pendingCountEl) {
          const offCount = (this.offlineQueue || []).length;
          pendingCountEl.textContent = offCount > 0 
            ? \`\${offCount} alteração\${offCount === 1 ? '' : 'ões'} offline acumulada\${offCount === 1 ? '' : 's'}\` 
            : (this.hasPendingSync ? '1 payload pendente para envio' : 'Nenhum item pendente');
        }

        // Atualiza switch de forçar offline
        const checkOffline = document.getElementById('checkForceOffline');
        if (checkOffline) {
          checkOffline.checked = !!this.forceOffline;
        }

        // Atualiza banner de pendências offline nos ajustes
        const banner = document.getElementById('offlinePendingBanner');
        const bannerText = document.getElementById('offlinePendingText');
        if (banner) {
          const count = (this.offlineQueue || []).length;
          if (count > 0) {
            banner.style.display = 'flex';
            if (bannerText) bannerText.textContent = \`Você possui \${count} alteração\${count === 1 ? '' : 'ões'} feita\${count === 1 ? '' : 's'} offline pronta\${count === 1 ? '' : 's'} para enviar.\`;
          } else {
            banner.style.display = 'none';
          }
        }`;

if (content.includes(oldDiagSnippet)) {
  content = content.replace(oldDiagSnippet, newDiagSnippet);
  console.log('SyncManager.updateDiagnosticsUI updated.');
}

// =========================================================================
// 4. PERFORMANCE & ANTI-LAG: StudyHoursManager.renderTab guard & updateTopicDom
// =========================================================================

// StudyHoursManager.renderTab guard
const oldRenderTab = `      renderTab() {
        this.renderPeriodControls();
        const logs = this.getFilteredLogs();
        this.renderSummaryCards(logs);
        this.renderChart(logs);
        this.renderDayTimeline(logs);
        this.renderSubjectsAccordion(logs);
        this.updateSettingsCard();
      },`;

const newRenderTab = `      renderTab(force = false) {
        // ANTI-LAG: Se a aba Horas de Estudo não estiver visível, marca como dirty e não gasta CPU!
        if (!force && typeof App !== 'undefined' && App.activeTab !== 'tab-study-hours') {
          this._dirty = true;
          return;
        }
        this._dirty = false;
        this.renderPeriodControls();
        const logs = this.getFilteredLogs();
        this.renderSummaryCards(logs);
        this.renderChart(logs);
        this.renderDayTimeline(logs);
        this.renderSubjectsAccordion(logs);
        this.updateSettingsCard();
      },`;

if (content.includes(oldRenderTab)) {
  content = content.replace(oldRenderTab, newRenderTab);
  console.log('StudyHoursManager.renderTab guarded for zero lag when inactive.');
}

// In toggleTopic: replace full App.renderSubjects() with targeted App.updateTopicDom()
const oldToggleTopicCall = `          App.saveToStorage();
          App.renderSubjects();
          this.renderTab();`;

const newToggleTopicCall = `          App.saveToStorage();
          App.updateTopicDom(materiaId, topicIndex, false);
          if (App.activeTab === 'tab-study-hours') {
            this.renderTab();
          } else {
            this._dirty = true;
          }`;

if (content.includes(oldToggleTopicCall)) {
  content = content.replace(oldToggleTopicCall, newToggleTopicCall);
  console.log('StudyHoursManager.toggleTopic uncheck call optimized.');
}

const oldToggleTopicCheckCall = `            App.saveToStorage();
            App.renderSubjects();
            this.renderTab();
            App.showToast(\`Estudo registrado: \${this.formatMinutes(this.defaultMinutes)}!\`, 'success');`;

const newToggleTopicCheckCall = `            App.saveToStorage();
            App.updateTopicDom(materiaId, topicIndex, true);
            if (App.activeTab === 'tab-study-hours') {
              this.renderTab();
            } else {
              this._dirty = true;
            }
            App.showToast(\`Estudo registrado: \${this.formatMinutes(this.defaultMinutes)}!\`, 'success');`;

if (content.includes(oldToggleTopicCheckCall)) {
  content = content.replace(oldToggleTopicCheckCall, newToggleTopicCheckCall);
  console.log('StudyHoursManager.toggleTopic check call optimized.');
}

// =========================================================================
// 5. App: updateTopicDom, debounced saveToStorage, and switchTab optimizations
// =========================================================================

// Add updateTopicDom and debounced saveToStorage in App
const oldSaveToStorage = `      saveToStorage() {
        try {
          localStorage.setItem('concurso_app_data', JSON.stringify(this.data));
          localStorage.setItem('concurso_schedules_list', JSON.stringify(this.schedules));
          localStorage.setItem('concurso_active_schedule_id', this.activeScheduleId || '');
          // Mantém chave legada sincronizada com o cronograma ativo para compatibilidade
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

const newSaveToStorage = `      _saveTimer: null,

      updateTopicDom(materiaId, topicIndex, isDone) {
        const body = document.getElementById(\`body-\${materiaId}\`);
        if (body) {
          const list = body.querySelector('.topics-list');
          if (list) {
            const items = list.querySelectorAll('.topic-item');
            if (items && items[topicIndex]) {
              const item = items[topicIndex];
              const checkbox = item.querySelector('input[type="checkbox"]');
              if (checkbox) checkbox.checked = !!isDone;
              if (isDone) item.classList.add('done');
              else item.classList.remove('done');
            }
          }
        }
        this.updateHoursBadge();
      },

      saveToStorage(immediate = false) {
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

if (content.includes(oldSaveToStorage)) {
  content = content.replace(oldSaveToStorage, newSaveToStorage);
  console.log('App.saveToStorage debounced and updateTopicDom implemented.');
}

// In switchTab: handle tab-library and instant scroll
const oldSwitchTab = `        if (tabId === 'tab-study-hours') {
          if (typeof StudyHoursManager !== 'undefined' && StudyHoursManager.renderTab) {
            StudyHoursManager.renderTab();
          }
        }

        if (tabId === 'tab-settings') {
          this.renderDiagnosticsLog();
          if (typeof SyncManager !== 'undefined' && SyncManager.updateDiagnosticsUI) {
            SyncManager.updateDiagnosticsUI();
          }
          if (typeof StudyHoursManager !== 'undefined' && StudyHoursManager.updateSettingsCard) {
            StudyHoursManager.updateSettingsCard();
          }
          if (typeof BackupManager !== 'undefined' && BackupManager.renderBackupCard) {
            BackupManager.renderBackupCard();
          }
        }

        // Se abriu a aba do leitor e já temos um documento, ajusta se necessário
        if (tabId === 'tab-pdf-reader' && this.pdfReader && this.pdfReader.doc) {
          setTimeout(() => {
            if (window.innerWidth <= 768 && !this.pdfReader._didAutoFit) {
              this.pdfReader._didAutoFit = true;
              App.pdfReaderFitWidth();
            }
          }, 100);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });`;

const newSwitchTab = `        if (tabId === 'tab-study-hours') {
          if (typeof StudyHoursManager !== 'undefined' && StudyHoursManager.renderTab) {
            StudyHoursManager.renderTab(true);
          }
        }

        if (tabId === 'tab-library') {
          if (typeof LibraryManager !== 'undefined' && LibraryManager.refresh) {
            LibraryManager.refresh();
          }
        }

        if (tabId === 'tab-schedule') {
          if (!this._scheduleRendered) {
            this._scheduleRendered = true;
            this.renderSchedule();
          }
        }

        if (tabId === 'tab-settings') {
          this.renderDiagnosticsLog();
          if (typeof SyncManager !== 'undefined' && SyncManager.updateDiagnosticsUI) {
            SyncManager.updateDiagnosticsUI();
          }
          if (typeof StudyHoursManager !== 'undefined' && StudyHoursManager.updateSettingsCard) {
            StudyHoursManager.updateSettingsCard();
          }
          if (typeof BackupManager !== 'undefined' && BackupManager.renderBackupCard) {
            BackupManager.renderBackupCard();
          }
        }

        // Se abriu a aba do leitor e já temos um documento, ajusta se necessário
        if (tabId === 'tab-pdf-reader' && this.pdfReader && this.pdfReader.doc) {
          setTimeout(() => {
            if (window.innerWidth <= 768 && !this.pdfReader._didAutoFit) {
              this.pdfReader._didAutoFit = true;
              App.pdfReaderFitWidth();
            }
          }, 100);
        }

        // ANTI-LAG: Scroll instantâneo evita layout thrashing durante a troca de abas
        window.scrollTo(0, 0);`;

if (content.includes(oldSwitchTab)) {
  content = content.replace(oldSwitchTab, newSwitchTab);
  console.log('App.switchTab updated with tab-library handling and instant scroll.');
}

// In App.init: lazy-render other tabs so initial startup is instant (< 300ms)
const oldInitRenders = `        if (profiler) profiler.mark('first_render_start');
        safeRun('Renderização de Telas', () => {
          this.renderAll();
          this.renderAutoConfigPanel();
          this.updateHoursBadge();
          this.updateAutoConfigDiagnosis();
          this.renderExamCountdown();
          this.renderSpacedReviews();
          this.renderScheduleProgress();
          this.renderDiagnosticsLog();
        });
        if (profiler) profiler.mark('first_render_end');`;

const newInitRenders = `        if (profiler) profiler.mark('first_render_start');
        safeRun('Renderização de Telas', () => {
          // Renderiza apenas a tela ativa inicial para máxima velocidade e zero lag
          this.renderSubjectList();
          this.renderUnclassified();
          this.updateHeaderCounters();
          this.updateHoursBadge();

          // Inicializa a Biblioteca Virtual em segundo plano
          if (typeof LibraryManager !== 'undefined' && LibraryManager.init) {
            LibraryManager.init().catch(() => {});
          }
        });
        if (profiler) profiler.mark('first_render_end');`;

if (content.includes(oldInitRenders)) {
  content = content.replace(oldInitRenders, newInitRenders);
  console.log('App.init updated with lazy tab rendering.');
}

// Restore line endings if needed
if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('All JS logic applied to index.html successfully!');
