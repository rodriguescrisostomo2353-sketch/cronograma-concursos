const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

console.log('====================================================');
console.log('TESTE AUTOMATIZADO DO SISTEMA DE BACKUP (v1.7.3)');
console.log('====================================================\n');

const virtualConsole = new VirtualConsole();
const consoleErrors = [];
virtualConsole.on('error', (...args) => consoleErrors.push(args));
virtualConsole.on('jsdomError', (err) => {
  if (!err.message.includes('getContext')) {
    consoleErrors.push([err.message, err.stack]);
  }
});

const htmlSource = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(htmlSource, {
  url: 'http://localhost:8080/',
  runScripts: 'dangerously',
  resources: 'usable',
  virtualConsole,
  pretendToBeVisual: true
});

const { window } = dom;
window.scrollTo = () => {};
window.alert = () => {};
window.confirm = () => true;

// Mock URL.createObjectURL e revokeObjectURL
let createdBlobUrl = null;
let lastDownloadedName = null;
window.URL.createObjectURL = (blob) => {
  createdBlobUrl = 'blob:test-' + Date.now();
  return createdBlobUrl;
};
window.URL.revokeObjectURL = (url) => {
  createdBlobUrl = null;
};

// Monitora cliques em downloads
const origCreateElement = window.document.createElement.bind(window.document);
window.document.createElement = function(tag) {
  const el = origCreateElement(tag);
  if (tag.toLowerCase() === 'a') {
    el.click = function() {
      lastDownloadedName = el.download;
    };
  }
  return el;
};

setTimeout(async () => {
  let passed = 0;
  let total = 0;

  function check(cond, title, detail = '') {
    total++;
    if (cond) {
      passed++;
      console.log(`✅ [PASS] ${title}`);
      if (detail) console.log(`   └─ Detalhe: ${detail}`);
    } else {
      console.error(`❌ [FAIL] ${title}`);
      if (detail) console.error(`   └─ Erro: ${detail}`);
    }
  }

  try {
    // 1. Verificação da existência do BackupManager global
    check(
      typeof window.BackupManager === 'object',
      'Objeto global window.BackupManager inicializado',
      `Tipo: ${typeof window.BackupManager}`
    );

    // 2. Métodos essenciais presentes
    const methods = [
      'init', 'createBackupPayload', 'downloadBackup', 'promptUploadFile',
      'onFileSelected', 'processBackupText', 'selectRestoreOption',
      'executeRestore', 'undoRestore', 'createEmergencySnapshot',
      'getLocalSnapshots', 'addLocalSnapshot', 'createLocalSnapshotManual',
      'restoreLocalSnapshot', 'deleteLocalSnapshot', 'renderBackupCard'
    ];
    const missingMethods = methods.filter(m => typeof window.BackupManager[m] !== 'function');
    check(
      missingMethods.length === 0,
      'Todos os métodos obrigatórios implementados no BackupManager',
      missingMethods.length ? `Faltando: ${missingMethods.join(', ')}` : '16/16 métodos verificados'
    );

    // 3. Delegadores presentes em App
    check(
      typeof window.App.downloadBackup === 'function' &&
      typeof window.App.uploadBackup === 'function' &&
      typeof window.App.openBackupModal === 'function',
      'Métodos delegadores App.downloadBackup, App.uploadBackup e App.openBackupModal disponíveis'
    );

    // 4. Elementos visuais no DOM
    const cardEl = window.document.getElementById('settingsBackupCard');
    const btnDownload = window.document.getElementById('btnDownloadBackupFile');
    const btnUpload = window.document.getElementById('btnUploadBackupFile');
    const inputUpload = window.document.getElementById('inputBackupUploadFile');
    const dropZone = window.document.getElementById('backupDropZone');
    const modalRestore = window.document.getElementById('modalRestoreBackup');
    const snapshotsList = window.document.getElementById('backupSnapshotsList');
    const undoBanner = window.document.getElementById('backupUndoBanner');

    check(
      cardEl && btnDownload && btnUpload && inputUpload && dropZone && modalRestore && snapshotsList && undoBanner,
      'Todos os elementos visuais de Backup & Restauração presentes no DOM',
      'Card de ajustes, botões, dropzone, modal e banner de desfazer validados'
    );

    // 5. Carregar dados de teste
    window.App.loadDemoData();
    const origMateriasCount = window.App.data.materias.length;
    check(origMateriasCount > 0, 'Dados de teste carregados', `${origMateriasCount} matérias disponíveis`);

    // 6. Teste de geração de payload (createBackupPayload)
    const payload = await window.BackupManager.createBackupPayload();
    check(
      payload && payload.app && payload.version === '1.7.3' && payload.summary && payload.data,
      'createBackupPayload() gera estrutura padronizada com metadata e resumo',
      `App: ${payload.app}, Versão: ${payload.version}, Matérias no resumo: ${payload.summary.materiasCount}`
    );

    // 7. Teste de Download de Backup
    await window.BackupManager.downloadBackup();
    check(
      lastDownloadedName && lastDownloadedName.startsWith('backup-cronograma-concursos-') && lastDownloadedName.endsWith('.json'),
      'downloadBackup() dispara download de arquivo .json com nomenclatura correta',
      `Arquivo gerado: ${lastDownloadedName}`
    );

    const lastTime = window.localStorage.getItem('concurso_last_backup_download_time');
    check(!!lastTime, 'Data do último backup gravada no localStorage', `Data: ${lastTime}`);

    // 8. Snapshots locais
    const initialSnapshots = window.BackupManager.getLocalSnapshots();
    check(initialSnapshots.length >= 1, 'Snapshot local registrado automaticamente após o download', `Snapshots: ${initialSnapshots.length}`);

    window.BackupManager.createLocalSnapshotManual();
    const afterManual = window.BackupManager.getLocalSnapshots();
    check(afterManual.length === initialSnapshots.length + 1, 'Criação manual de snapshot com createLocalSnapshotManual()', `Snapshots agora: ${afterManual.length}`);

    // 9. Teste de processamento de texto de backup (processBackupText)
    const mockBackupData = {
      app: 'Cronograma de Estudos para Concursos',
      version: '1.7.3',
      exportDateFormatted: '14/10/2026 17:00',
      data: {
        materias: [
          { id: 'mat_test_1', nome: 'Direito Previdenciário', topicos: [{ id: 't1', texto: 'Seguridade Social' }] },
          { id: 'mat_test_2', nome: 'Contabilidade Geral', topicos: [{ id: 't2', texto: 'Balancete de Verificação' }] }
        ],
        schedules: [
          { id: 'sched_test_1', name: 'Cronograma Fiscal 2026', columns: [] }
        ],
        completedSlots: { 'slot_test_1': true },
        studyLog: [
          { id: 'log_test_1', materiaId: 'mat_test_1', topicoId: 't1', minutos: 60, data: '2026-10-14' }
        ],
        examTitle: 'Auditor Fiscal RFB',
        examDate: '2026-12-15'
      }
    };

    window.BackupManager.processBackupText(JSON.stringify(mockBackupData), 'backup_auditor_rfb.json');
    const previewNameEl = window.document.getElementById('backupPreviewFileName');
    const previewSubjEl = window.document.getElementById('backupPreviewSubjects');
    const previewSchedEl = window.document.getElementById('backupPreviewSchedules');
    const modalIsOpen = modalRestore.classList.contains('open') && !modalRestore.classList.contains('hidden');

    check(
      modalIsOpen && previewNameEl.textContent === 'backup_auditor_rfb.json' && previewSubjEl.textContent.includes('2 matéria'),
      'processBackupText() abre o modal de pré-visualização com dados reais do arquivo',
      `Modal aberto: ${modalIsOpen}, Matérias: ${previewSubjEl.textContent}`
    );

    // 10. Teste de Restauração em modo Substituição (Replace)
    window.BackupManager.selectRestoreOption('replace');
    await window.BackupManager.executeRestore();

    check(
      window.App.data.materias.length === 2 &&
      window.App.data.materias[0].nome === 'Direito Previdenciário' &&
      window.App.examTitle === 'Auditor Fiscal RFB',
      'executeRestore() modo Substituição restaura dados do backup com fidelidade',
      `Matérias restauradas: ${window.App.data.materias.map(m => m.nome).join(', ')}`
    );

    // 11. Teste do Snapshot de Emergência e Desfazer Restauração
    const emergencySnapshot = window.localStorage.getItem('concurso_backup_emergency_pre_restore');
    check(!!emergencySnapshot, 'Snapshot de emergência pré-restauração gravado para prevenção contra perda de dados');

    window.BackupManager.undoRestore();
    check(
      window.App.data.materias.length === origMateriasCount,
      'undoRestore() reverte instantaneamente para os dados anteriores sem perda',
      `Matérias após desfazer: ${window.App.data.materias.length} (original: ${origMateriasCount})`
    );

    // 12. Teste de Restauração em modo Mesclagem (Merge)
    window.BackupManager.processBackupText(JSON.stringify(mockBackupData), 'backup_merge.json');
    window.BackupManager.selectRestoreOption('merge');
    await window.BackupManager.executeRestore();

    const hasNewSubject = window.App.data.materias.some(m => m.nome === 'Direito Previdenciário');
    check(
      hasNewSubject && window.App.data.materias.length > 2,
      'executeRestore() modo Mesclagem une matérias do backup com as matérias existentes sem apagar nada',
      `Total de matérias mescladas: ${window.App.data.materias.length}`
    );

    // 13. Exclusão de Snapshot
    const snapBeforeDel = window.BackupManager.getLocalSnapshots();
    const snapIdToDelete = snapBeforeDel[0].id;
    window.BackupManager.deleteLocalSnapshot(snapIdToDelete);
    const snapAfterDel = window.BackupManager.getLocalSnapshots();
    check(
      snapAfterDel.length === snapBeforeDel.length - 1,
      'deleteLocalSnapshot() remove snapshot específico da memória local',
      `Antes: ${snapBeforeDel.length}, Depois: ${snapAfterDel.length}`
    );

  } catch (err) {
    console.error('Erro inesperado no teste:', err);
    check(false, 'Execução dos testes sem exceções', err.message);
  }

  console.log('\n====================================================');
  console.log(`RESULTADO FINAL: ${passed} de ${total} testes APROVADOS!`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}, 500);
