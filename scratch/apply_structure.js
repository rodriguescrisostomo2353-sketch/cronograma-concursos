const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
const backupPath = path.join(__dirname, '..', 'index.html.before_library.bak');

let content = fs.readFileSync(filePath, 'utf8');

// 1. Create safety backup
fs.writeFileSync(backupPath, content, 'utf8');
console.log('Safety backup created at index.html.before_library.bak');

// Detect line endings
const isCRLF = content.includes('\r\n');
const lineEnding = isCRLF ? '\r\n' : '\n';
console.log('Line ending detected:', isCRLF ? 'CRLF' : 'LF');

// Normalize to LF for easy reliable replacements, then restore CRLF at the end
content = content.replace(/\r\n/g, '\n');

// =========================================================================
// PARTE 1: CSS DA BIBLIOTECA VIRTUAL, STATUS PILL & OTIMIZAÇÕES ANTI-LAG
// =========================================================================
const cssToAdd = `
    /* ==========================================================================
       NOVO: BIBLIOTECA VIRTUAL, MODO OFFLINE & INDICADOR DE SINCRONIZAÇÃO
       ========================================================================== */
    .sync-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-main);
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .sync-status-pill:hover {
      background: var(--bg-subtle);
    }
    .sync-status-pill.status-synced {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
      color: #059669;
    }
    .sync-status-pill.status-offline {
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.35);
      color: #b45309;
    }
    .sync-status-pill.status-syncing {
      background: rgba(79, 70, 229, 0.1);
      border-color: rgba(79, 70, 229, 0.3);
      color: #4f46e5;
    }
    [data-theme="dark"] .sync-status-pill.status-synced {
      background: rgba(16, 185, 129, 0.18);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    [data-theme="dark"] .sync-status-pill.status-offline {
      background: rgba(245, 158, 11, 0.18);
      border-color: rgba(245, 158, 11, 0.4);
      color: #fbbf24;
    }

    /* Biblioteca Virtual */
    .library-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 10px 0 30px 0;
    }
    .library-header-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 20px 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .library-header-info h2 {
      margin: 0 0 4px 0;
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .library-header-info p {
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-muted);
    }
    .library-header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Toolbar de Busca e Filtros */
    .library-toolbar {
      display: grid;
      grid-template-columns: 2fr 1.2fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    @media (max-width: 820px) {
      .library-toolbar {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media (max-width: 520px) {
      .library-toolbar {
        grid-template-columns: 1fr;
      }
    }

    /* Dropzone Compacto */
    .library-dropzone {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      text-align: center;
      background: var(--bg-card);
      cursor: pointer;
      margin-bottom: 20px;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }
    .library-dropzone:hover, .library-dropzone.dragover {
      border-color: var(--accent-primary);
      background: var(--bg-subtle);
    }
    .library-dropzone-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .library-dropzone-icon {
      font-size: 1.8rem;
    }
    .library-dropzone-text strong {
      color: var(--text-main);
      font-size: 0.92rem;
    }
    .library-dropzone-text p {
      margin: 2px 0 0 0;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    /* Barra de Estatísticas */
    .library-stats-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .library-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 12px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      font-weight: 600;
      color: var(--text-main);
    }

    /* Grid de Arquivos */
    .library-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 16px;
    }
    @media (max-width: 600px) {
      .library-grid {
        grid-template-columns: 1fr;
      }
    }

    .library-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      position: relative;
    }
    .library-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border-color: var(--border-focus);
    }
    .library-card-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    .library-card-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: var(--pastel-red-bg);
      color: var(--pastel-red-text);
      border: 1px solid var(--pastel-red-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }
    .library-card-icon.category-edital {
      background: var(--pastel-blue-bg);
      color: var(--pastel-blue-text);
      border-color: var(--pastel-blue-border);
    }
    .library-card-icon.category-resumo {
      background: var(--pastel-green-bg);
      color: var(--pastel-green-text);
      border-color: var(--pastel-green-border);
    }
    .library-card-icon.category-questoes {
      background: var(--pastel-purple-bg);
      color: var(--pastel-purple-text);
      border-color: var(--pastel-purple-border);
    }
    .library-card-icon.category-legislacao {
      background: var(--pastel-orange-bg);
      color: var(--pastel-orange-text);
      border-color: var(--pastel-orange-border);
    }

    .library-card-title-area {
      flex: 1;
      min-width: 0;
    }
    .library-card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0 0 4px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .library-card-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .library-badge-cat {
      font-size: 0.7rem;
      padding: 1px 7px;
      border-radius: 10px;
      font-weight: 600;
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
    }
    .library-badge-subject {
      font-size: 0.7rem;
      padding: 1px 7px;
      border-radius: 10px;
      font-weight: 600;
    }

    .library-card-meta {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin: 8px 0 14px 0;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .library-card-notes {
      font-size: 0.78rem;
      color: var(--text-muted);
      background: var(--bg-subtle);
      padding: 6px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      border-left: 3px solid var(--accent-primary);
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .library-card-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid var(--border-color);
    }
    .library-card-actions .btn {
      flex: 1;
      justify-content: center;
      padding: 6px 10px;
      font-size: 0.8rem;
    }
    .library-card-actions .btn-icon {
      flex: 0 0 32px;
      height: 32px;
    }

    /* Estado Vazio */
    .library-empty-state {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 40px 20px;
      text-align: center;
      color: var(--text-muted);
    }
    .library-empty-icon {
      font-size: 3rem;
      margin-bottom: 12px;
    }
    .library-empty-state h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0 0 6px 0;
    }
    .library-empty-state p {
      max-width: 440px;
      margin: 0 auto 16px auto;
      font-size: 0.88rem;
    }

    /* Switch Toggle */
    .switch-toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .switch-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--border-color);
      transition: .2s;
      border-radius: 24px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: var(--accent-primary);
    }
    input:checked + .slider:before {
      transform: translateX(20px);
    }
`;

// Inject CSS right before </style>
const styleEndIdx = content.indexOf('</style>');
if (styleEndIdx === -1) throw new Error('Could not find </style>');
content = content.substring(0, styleEndIdx) + cssToAdd + '\n  ' + content.substring(styleEndIdx);
console.log('CSS for Virtual Library and Offline Mode injected.');

// =========================================================================
// PARTE 2: NAVEGAÇÃO (DESKTOP NAV TABS, MOBILE BOTTOM NAV, MORE SHEET)
// =========================================================================

// Desktop Nav Tabs: Add "📁 Biblioteca" between Leitor de PDF and Upload do Edital
const navTabsTarget = '<button class="nav-tab-btn" data-tab="tab-pdf-reader">\n        📖 Leitor de PDF\n      </button>';
const navTabsReplacement = `<button class="nav-tab-btn" data-tab="tab-pdf-reader">
        📖 Leitor de PDF
      </button>
      <button class="nav-tab-btn" data-tab="tab-library">
        📁 Biblioteca <span class="tab-badge" id="badgeLibraryCount" style="display: none;">0</span>
      </button>`;

if (content.includes(navTabsTarget)) {
  content = content.replace(navTabsTarget, navTabsReplacement);
  console.log('Desktop Nav: tab-library button added.');
} else {
  console.warn('Desktop Nav target not found directly, checking fallback...');
}

// Mobile Bottom Sheet: Add "📁 Biblioteca Virtual"
const sheetTarget = `<button type="button" class="sheet-menu-item" id="sheetBtnStudyHours" onclick="App.closeMoreMenuSheet(); App.switchTab('tab-study-hours');">
          <span style="font-size: 1.25rem; margin-right: 10px;">⏱️</span>
          <span>Horas de Estudo</span>
        </button>`;

const sheetReplacement = `<button type="button" class="sheet-menu-item" id="sheetBtnLibrary" onclick="App.closeMoreMenuSheet(); App.switchTab('tab-library');">
          <span style="font-size: 1.25rem; margin-right: 10px;">📁</span>
          <span>Biblioteca Virtual</span>
          <span class="tab-badge" id="sheetBadgeLibrary" style="margin-left: auto; display: none;">0</span>
        </button>
        <button type="button" class="sheet-menu-item" id="sheetBtnStudyHours" onclick="App.closeMoreMenuSheet(); App.switchTab('tab-study-hours');">
          <span style="font-size: 1.25rem; margin-right: 10px;">⏱️</span>
          <span>Horas de Estudo</span>
        </button>`;

if (content.includes(sheetTarget)) {
  content = content.replace(sheetTarget, sheetReplacement);
  console.log('Mobile Sheet: Biblioteca Virtual item added.');
} else {
  console.warn('Mobile Sheet target not found.');
}

// =========================================================================
// PARTE 3: SEÇÃO HTML DA ABA BIBLIOTECA VIRTUAL
// =========================================================================
const librarySectionHtml = `
    <!-- ========================================================================
         ABA: BIBLIOTECA VIRTUAL DE ARQUIVOS (PDFs, APOSTILAS, RESUMOS)
         ======================================================================== -->
    <section id="tab-library" class="tab-content">
      <div class="library-container">
        
        <!-- Cabeçalho da Biblioteca -->
        <div class="library-header-card">
          <div class="library-header-info">
            <h2>📁 Biblioteca Virtual</h2>
            <p>Guarde seus PDFs (editais, apostilas, resumos e leis), organize por matéria e leia ou exporte offline.</p>
          </div>
          <div class="library-header-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="LibraryManager.openUploadModal()">
              ➕ Adicionar Arquivo
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="LibraryManager.exportAllFiles()">
              📤 Exportar Backup
            </button>
          </div>
        </div>

        <!-- Toolbar de Busca e Filtros -->
        <div class="library-toolbar">
          <input type="text" id="librarySearchInput" class="input-field" placeholder="🔍 Buscar por nome do arquivo ou anotação...">
          <select id="librarySubjectFilter" class="input-field">
            <option value="all">📚 Todas as Matérias</option>
          </select>
          <select id="libraryCategoryFilter" class="input-field">
            <option value="all">📂 Todas as Categorias</option>
            <option value="edital">📑 Edital</option>
            <option value="apostila">📘 Apostila</option>
            <option value="resumo">📝 Resumo</option>
            <option value="questoes">❓ Questões</option>
            <option value="legislacao">⚖️ Legislação</option>
            <option value="outro">📁 Outro</option>
          </select>
          <select id="librarySortSelect" class="input-field">
            <option value="date_desc">🕒 Mais Recentes</option>
            <option value="date_asc">🕒 Mais Antigos</option>
            <option value="name_asc">🔤 Nome (A-Z)</option>
            <option value="size_desc">💾 Maior Tamanho</option>
          </select>
        </div>

        <!-- Dropzone Rápido -->
        <div class="library-dropzone" id="libraryDropZone">
          <input type="file" id="libraryFileInput" accept="application/pdf" multiple style="display: none;">
          <div class="library-dropzone-inner">
            <span class="library-dropzone-icon">📥</span>
            <div class="library-dropzone-text">
              <strong>Arraste arquivos PDF aqui ou clique para selecionar</strong>
              <p>Os arquivos são salvos com segurança de forma 100% offline no IndexedDB do seu navegador.</p>
            </div>
          </div>
        </div>

        <!-- Barra de Status de Armazenamento -->
        <div class="library-stats-bar">
          <div>
            <span class="library-badge-pill" id="libraryCountPill">0 arquivos</span>
            <span class="library-badge-pill" id="librarySizePill" style="margin-left: 6px;">0 MB</span>
          </div>
          <div>
            <span style="font-size: 0.78rem;">Armazenamento 100% Offline (IndexedDB)</span>
          </div>
        </div>

        <!-- Grid de Arquivos -->
        <div class="library-grid" id="libraryFilesGrid">
          <!-- Renderizado dinamicamente por LibraryManager.render() -->
        </div>

        <!-- Estado Vazio -->
        <div class="library-empty-state" id="libraryEmptyState" style="display: none;">
          <div class="library-empty-icon">📂</div>
          <h3>Sua biblioteca está vazia</h3>
          <p>Adicione editais, resumos ou apostilas em PDF para ter acesso rápido a qualquer hora, mesmo sem conexão à internet.</p>
          <button type="button" class="btn btn-primary" onclick="LibraryManager.openUploadModal()">
            ➕ Adicionar Primeiro Arquivo
          </button>
        </div>

      </div>
    </section>
`;

// Insert library section right after </section> of tab-pdf-reader
const pdfReaderSectionEnd = '</section>\n\n    <!-- ========================================================================\n         ABA 4: ATUALIZAÇÕES DO APLICATIVO';
if (content.includes(pdfReaderSectionEnd)) {
  content = content.replace(pdfReaderSectionEnd, '</section>\n' + librarySectionHtml + '\n    <!-- ========================================================================\n         ABA 4: ATUALIZAÇÕES DO APLICATIVO');
  console.log('HTML section #tab-library inserted successfully.');
} else {
  console.warn('tab-pdf-reader section end marker not matched directly, looking for fallback...');
  const altMarker = 'id="tab-updates"';
  const updatesIdx = content.indexOf(altMarker);
  const prevSectionIdx = content.lastIndexOf('</section>', updatesIdx);
  if (prevSectionIdx !== -1) {
    content = content.substring(0, prevSectionIdx + 10) + '\n' + librarySectionHtml + '\n' + content.substring(prevSectionIdx + 10);
    console.log('HTML section #tab-library inserted via fallback.');
  }
}

// =========================================================================
// PARTE 4: MODAIS DA BIBLIOTECA VIRTUAL & MODO OFFLINE EM AJUSTES
// =========================================================================
const libraryModalsHtml = `
  <!-- Modal: Upload de Arquivo para Biblioteca -->
  <div class="modal-overlay hidden" id="modalLibraryUpload">
    <div class="modal-card" style="max-width: 480px;">
      <div class="modal-header">
        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-main);">
          ➕ Adicionar Arquivo à Biblioteca
        </h3>
        <button type="button" class="btn-icon" onclick="LibraryManager.closeUploadModal()">✕</button>
      </div>
      <form id="formLibraryUpload" onsubmit="LibraryManager.submitUploadModal(event)">
        <div class="modal-body" style="padding: 16px 20px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; display: block;">
              Arquivo PDF:
            </label>
            <input type="file" id="modalLibraryFileInput" accept="application/pdf" class="input-field" required style="width: 100%;">
          </div>
          <div>
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; display: block;">
              Título / Nome de Exibição:
            </label>
            <input type="text" id="modalLibraryTitleInput" class="input-field" placeholder="Ex: Apostila de Direito Constitucional" style="width: 100%;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; display: block;">
                Matéria Vinculada:
              </label>
              <select id="modalLibrarySubjectSelect" class="input-field" style="width: 100%;">
                <option value="">Geral / Sem Matéria</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; display: block;">
                Categoria:
              </label>
              <select id="modalLibraryCategorySelect" class="input-field" style="width: 100%;">
                <option value="edital">📑 Edital</option>
                <option value="apostila" selected>📘 Apostila</option>
                <option value="resumo">📝 Resumo</option>
                <option value="questoes">❓ Questões</option>
                <option value="legislacao">⚖️ Legislação</option>
                <option value="outro">📁 Outro</option>
              </select>
            </div>
          </div>
          <div>
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; display: block;">
              Observações / Anotações Rápidas:
            </label>
            <textarea id="modalLibraryNotesInput" class="input-field" rows="2" placeholder="Ex: Ler capítulos 1 a 4 para a prova" style="width: 100%; resize: vertical;"></textarea>
          </div>
        </div>
        <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn btn-secondary" onclick="LibraryManager.closeUploadModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btnSubmitLibraryUpload">Salvar na Biblioteca</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Editar Arquivo da Biblioteca -->
  <div class="modal-overlay hidden" id="modalLibraryEdit">
    <div class="modal-card" style="max-width: 480px;">
      <div class="modal-header">
        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-main);">
          ✏️ Editar Arquivo
        </h3>
        <button type="button" class="btn-icon" onclick="LibraryManager.closeEditModal()">✕</button>
      </div>
      <form id="formLibraryEdit" onsubmit="LibraryManager.submitEditModal(event)">
        <input type="hidden" id="modalLibraryEditId">
        <div class="modal-body" style="padding: 16px 20px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; display: block;">
              Título de Exibição:
            </label>
            <input type="text" id="modalLibraryEditTitle" class="input-field" required style="width: 100%;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; display: block;">
                Matéria Vinculada:
              </label>
              <select id="modalLibraryEditSubject" class="input-field" style="width: 100%;">
                <option value="">Geral / Sem Matéria</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; display: block;">
                Categoria:
              </label>
              <select id="modalLibraryEditCategory" class="input-field" style="width: 100%;">
                <option value="edital">📑 Edital</option>
                <option value="apostila">📘 Apostila</option>
                <option value="resumo">📝 Resumo</option>
                <option value="questoes">❓ Questões</option>
                <option value="legislacao">⚖️ Legislação</option>
                <option value="outro">📁 Outro</option>
              </select>
            </div>
          </div>
          <div>
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; display: block;">
              Observações / Anotações Rápidas:
            </label>
            <textarea id="modalLibraryEditNotes" class="input-field" rows="2" style="width: 100%; resize: vertical;"></textarea>
          </div>
        </div>
        <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn btn-secondary" onclick="LibraryManager.closeEditModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Alterações</button>
        </div>
      </form>
    </div>
  </div>
`;

// Insert library modals before toast container
const toastTarget = '<!-- Container de Notificações Toast -->';
if (content.includes(toastTarget)) {
  content = content.replace(toastTarget, libraryModalsHtml + '\n  ' + toastTarget);
  console.log('Library modals added to HTML.');
}

// Add Offline Mode Card in Settings
const settingsCardTarget = '<div class="sync-diagnostics-panel" id="syncDiagnosticsPanel"';
const offlineModeCardHtml = `
            <!-- Painel de Modo Offline & Fila de Sincronização -->
            <div class="offline-mode-card" style="margin-top: 14px; padding: 12px 14px; background: var(--bg-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <div>
                  <strong style="color: var(--text-main); font-size: 0.9rem;">📴 Forçar Modo Offline</strong>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin: 2px 0 0 0;">
                    Use o app 100% desconectado. Todas as alterações serão salvas localmente e enfileiradas para sincronização posterior.
                  </p>
                </div>
                <label class="switch-toggle" style="flex-shrink: 0;" title="Ativar ou desativar modo offline forçado">
                  <input type="checkbox" id="checkForceOffline" onchange="SyncManager.toggleForceOffline(this.checked)">
                  <span class="slider round"></span>
                </label>
              </div>
              <div id="offlinePendingBanner" style="display: none; margin-top: 10px; padding: 8px 12px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-xs); font-size: 0.82rem; color: #b45309; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                <span id="offlinePendingText">Você possui 0 alterações feitas offline prontas para enviar.</span>
                <button type="button" class="btn btn-primary btn-sm" style="padding: 2px 10px; font-size: 0.75rem;" onclick="App.manualSync()">
                  🔄 Sincronizar Agora
                </button>
              </div>
            </div>

            `;

if (content.includes(settingsCardTarget)) {
  content = content.replace(settingsCardTarget, offlineModeCardHtml + settingsCardTarget);
  console.log('Settings Offline Mode Card injected.');
}

// Restore line endings if needed
if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('index.html structure updated with HTML & CSS successfully.');
