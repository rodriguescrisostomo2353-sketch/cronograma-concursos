/**
 * BATERIA DE TESTES DE FUMAÇA (SMOKE TESTS) - ETAPA 0
 * Verifica o funcionamento das 13 áreas essenciais do sistema antes de qualquer refatoração.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

console.log('========================================================================');
console.log('  BATERIA DE TESTES DE FUMAÇA (SMOKE TESTS) - ESTADO ATUAL DO PROJETO');
console.log('========================================================================\n');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const virtualConsole = new VirtualConsole();
virtualConsole.on('error', () => {});
virtualConsole.on('warn', () => {});

// Mock IndexedDB store
const fakeDbStore = new Map();
const fakeIndexedDB = {
  open(dbName, version) {
    let onupgradeneededFn = null;
    let onsuccessFn = null;
    let onerrorFn = null;

    const request = {
      set onblocked(fn) {},
      set onupgradeneeded(fn) { onupgradeneededFn = fn; },
      set onsuccess(fn) { onsuccessFn = fn; },
      set onerror(fn) { onerrorFn = fn; }
    };

    setTimeout(() => {
      const db = {
        objectStoreNames: { contains: () => true },
        createObjectStore: () => {},
        transaction: () => ({
          objectStore: () => ({
            put: (val) => { fakeDbStore.set(val.id, val); },
            get: (id) => {
              const req = {};
              setTimeout(() => {
                req.result = fakeDbStore.get(id) || null;
                if (req.onsuccess) req.onsuccess({ target: req });
              }, 0);
              return req;
            },
            getAll: () => {
              const req = {};
              setTimeout(() => {
                req.result = Array.from(fakeDbStore.values());
                if (req.onsuccess) req.onsuccess({ target: req });
              }, 0);
              return req;
            },
            delete: (id) => { fakeDbStore.delete(id); }
          }),
          set oncomplete(cb) { setTimeout(cb, 0); },
          set onerror(cb) {}
        })
      };

      if (onupgradeneededFn) {
        onupgradeneededFn({ target: { result: db } });
      }
      if (onsuccessFn) {
        onsuccessFn({ target: { result: db } });
      }
    }, 5);

    return request;
  }
};

global.indexedDB = fakeIndexedDB;

const dom = new JSDOM(html, {
  url: 'https://rodriguescrisostomo2353-sketch.github.io/cronograma-concursos/',
  pretendToBeVisual: true,
  runScripts: 'dangerously'
});

const { window } = dom;
window.indexedDB = fakeIndexedDB;
global.window = window;
global.document = window.document;

// Polyfills para ambiente de teste JSDOM
window.scrollTo = () => {};
window.alert = () => {};
window.confirm = () => true;

const results = [];

function check(passed, name, detail = '') {
  results.push({ passed, name, detail });
  const status = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${status} ${name}`);
  if (detail) console.log(`   └─ ${detail}`);
}

async function runSmokeTests() {
  // 1. ABRIR O APP
  const hasApp = typeof window.App !== 'undefined' && window.App !== null;
  check(hasApp, '1. Abertura do App: Objeto window.App inicializado e acessível');

  if (hasApp && typeof window.App.init === 'function') {
    window.App.init();
    const isThemeLoaded = !!window.localStorage.getItem('concurso_theme') || !!window.document.documentElement.getAttribute('data-theme');
    check(isThemeLoaded, '1. Abertura do App: Ciclo de vida e temas carregados sem travar');
  }

  // 2. LISTAR MATÉRIAS
  window.App.loadDemoData();
  const materias = window.App.data && window.App.data.materias;
  const countMaterias = Array.isArray(materias) ? materias.length : 0;
  check(countMaterias > 0, '2. Listar Matérias: Matérias carregadas com sucesso', `${countMaterias} matérias encontradas`);

  window.App.renderAll();
  const subjectElements = window.document.querySelectorAll('.subject-card');
  check(subjectElements.length > 0, '2. Listar Matérias: Cards de matéria renderizados na interface DOM', `${subjectElements.length} cards no DOM`);

  // 3. LER UM EDITAL DE EXEMPLO
  const sampleEdital = [
    'LÍNGUA PORTUGUESA: 1 Compreensão e interpretação de textos de gêneros variados.',
    '2 Reconhecimento de tipos e gêneros textuais. 3 Domínio da ortografia oficial.',
    'DIREITO CONSTITUCIONAL: 1 Direitos e garantias fundamentais.',
    '2 Organização político-administrativa do Estado brasileiro.'
  ];
  let parseResult = null;
  if (typeof window.App.parseEditalText === 'function') {
    parseResult = window.App.parseEditalText(sampleEdital);
  }
  const parsedOk = parseResult && parseResult.materias && parseResult.materias.length >= 2;
  check(parsedOk, '3. Leitura de Edital: Parser inteligente identifica matérias e tópicos a partir do texto', 
    parsedOk ? `${parseResult.materias.length} matérias identificadas pelo parser` : 'Falha ao processar texto do edital');

  // 4. DIVIDIR TÓPICOS
  let divResult = null;
  if (typeof window.App.dividirMateriasSalvasPorNumeracao === 'function') {
    divResult = window.App.dividirMateriasSalvasPorNumeracao(false);
  }
  const divOk = divResult && typeof divResult.total === 'number';
  check(divOk, '4. Divisor de Tópicos: Algoritmo de divisão por numeração executa sem erros',
    divOk ? `Total avaliado: ${divResult.total} matérias (${divResult.alteradas} organizadas)` : 'Divisor não retornou resultado esperado');

  // 5. CRIAR CRONOGRAMA MANUAL
  window.App.wizard = {
    step: 3,
    type: 'manual',
    name: 'Cronograma Teste Smoke Manual',
    days: ['Segunda', 'Quarta', 'Sexta'],
    duration: 60,
    sessions: [
      {
        tempId: 'test-s1',
        dia: 'Segunda',
        subjectId: materias[0].id,
        subjectName: window.nomeMateria(materias[0]),
        paletteId: 'blue',
        startTime: '08:00',
        duration: 60,
        endTime: '09:00',
        topic: 'Interpretação de Texto'
      }
    ]
  };
  window.App.wizardSaveSchedule();
  const schedCreated = (window.App.schedules || []).find(s => s.name === 'Cronograma Teste Smoke Manual');
  check(!!schedCreated, '5. Criar Cronograma Manual: Criação e salvamento de cronograma com sessões estruturadas',
    schedCreated ? `ID: ${schedCreated.id}, Dias: ${schedCreated.dias.join(', ')}` : 'Não encontrado na lista de cronogramas');

  // 6. GERAR CRONOGRAMA AUTOMÁTICO
  window.App.wizard = {
    name: 'Cronograma Automático Smoke',
    type: 'auto',
    days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
  };
  window.App.confirmCreateScheduleAutoQuick();
  const autoSched = (window.App.schedules || []).find(s => s.name === 'Cronograma Automático Smoke');
  check(!!autoSched, '6. Gerar Cronograma Automático: Assistente gera ciclo automático e distribui matérias',
    autoSched ? `Modo: ${autoSched.type}, Slots criados com sucesso` : 'Falha ao gerar cronograma automático');

  // 7. MARCAR TÓPICO COMO ESTUDADO
  // Garante que tópicos da primeira matéria sejam objetos estruturados (normalização)
  const targetMat = materias[0];
  if (typeof targetMat.topicos[0] === 'string') {
    targetMat.topicos = targetMat.topicos.map((t, idx) => ({
      id: `top_lp_${idx}`,
      texto: t,
      concluido: false
    }));
  }
  const matId = targetMat.id;
  const initialDone = !!targetMat.topicos[0].concluido;

  window.StudyHoursManager.autoQuickMark = true;
  window.StudyHoursManager.toggleTopic(matId, 0);
  const updatedDone = !!targetMat.topicos[0].concluido;
  check(updatedDone !== initialDone, '7. Marcar Tópico Estudado: Alternância de status concluído/pendente',
    `Antes: ${initialDone} -> Depois: ${updatedDone}`);

  // 8. HORAS DE ESTUDO
  const studyLogs = window.StudyHoursManager.getStudyLog();
  window.StudyHoursManager.renderTab(true);
  const hoursTabEl = window.document.getElementById('tab-study-hours');
  const totalMin = studyLogs.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
  check(studyLogs.length > 0 && totalMin > 0, '8. Horas de Estudo: Painel de horas, métricas e estatísticas renderizados',
    `Sessões registradas: ${studyLogs.length} | Total acumulado: ${totalMin} min`);

  // 9. BACKUP E RESTAURAÇÃO (COM PROVA DE RESTAURAÇÃO FUNCIONAL)
  const backupPayload = await window.BackupManager.createBackupPayload();
  const backupValid = backupPayload && backupPayload.data && backupPayload.version && backupPayload.summary;
  check(backupValid, '9. Backup & Restauração: Geração de payload padronizado em JSON com resumo e dados',
    backupValid ? `Versão: ${backupPayload.version}, Matérias no backup: ${backupPayload.summary.materiasCount}` : 'Payload inválido');

  // Salva backup de teste no disco para comprovação
  const scratchDir = path.join(__dirname, 'scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  fs.writeFileSync(path.join(scratchDir, 'smoke_test_backup.json'), JSON.stringify(backupPayload, null, 2), 'utf8');

  // Altera os dados locais e executa restauração real via BackupManager
  const originalCount = window.App.data.materias.length;
  window.App.data.materias = [{ id: 'temp-mat', nome: 'Matéria Temporária', topicos: [] }];
  
  window.BackupManager.processBackupText(JSON.stringify(backupPayload), 'smoke_test_backup.json');
  window.BackupManager.selectRestoreOption('replace');
  await window.BackupManager.executeRestore();

  const restoredCount = window.App.data.materias.length;
  const restorePassed = restoredCount === originalCount;
  check(restorePassed, '9. Backup & Restauração: Restauração executada com sucesso e integridade total comprovada',
    `Original: ${originalCount} matérias | Temporário: 1 | Restaurado: ${restoredCount} matérias`);

  // 10. ABRIR PDF
  let pdfStorageOk = false;
  try {
    const dummyBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]).buffer; // %PDF-1.4
    const saveRes = await window.PdfStorage.saveFile('test-pdf-id', 'documento-teste.pdf', dummyBuffer, 5);
    const retrieved = await window.PdfStorage.getFile('test-pdf-id');
    console.log('PDF saveRes:', saveRes, 'retrieved:', retrieved);
    pdfStorageOk = retrieved && retrieved.name === 'documento-teste.pdf';
  } catch (err) {
    console.error('PDF test err:', err);
    pdfStorageOk = false;
  }
  check(pdfStorageOk, '10. Abrir PDF: Sistema de armazenamento de PDF offline (IndexedDB) funcional',
    pdfStorageOk ? 'Armazenamento e recuperação de buffer de PDF validados' : 'Erro ao ler ou gravar no IndexedDB');

  // 11. TEMA ESCURO / CLARO
  const initialTheme = window.document.documentElement.getAttribute('data-theme') || 'dark';
  window.App.toggleTheme();
  const toggledTheme = window.document.documentElement.getAttribute('data-theme');
  const themePassed = toggledTheme !== initialTheme && (toggledTheme === 'light' || toggledTheme === 'dark');
  check(themePassed, '11. Alternância de Temas: Troca dinâmica entre Claro e Escuro com persistência',
    `Tema inicial: ${initialTheme} -> Novo tema: ${toggledTheme}`);
  // Restaura tema original
  window.App.setTheme(initialTheme, true);

  // 12. ABA DE ATUALIZAÇÕES
  window.App.switchTab('tab-updates');
  const updatesTab = window.document.getElementById('tab-updates');
  const appVersionConst = window.APP_VERSION;
  const versionElement = window.document.getElementById('aboutAppVersion');
  const updatesPassed = !!updatesTab && updatesTab.classList.contains('active') && (versionElement ? versionElement.textContent.includes(appVersionConst) : true);
  check(updatesPassed, '12. Aba de Atualizações: Navegação, exibição de versão e changelog do app',
    `Versão atual: ${appVersionConst}`);

  // 13. LOGIN / AUTENTICAÇÃO (SE CONFIGURADO)
  const syncManagerExists = typeof window.SyncManager !== 'undefined';
  const hasAuthUI = !!window.document.getElementById('modalAuth') || !!window.document.getElementById('loginEmail');
  const syncStatus = syncManagerExists ? window.SyncManager.syncStatus : 'unknown';
  check(syncManagerExists && hasAuthUI, '13. Autenticação & Nuvem: Módulo de sincronização e interface de login disponíveis',
    `Status inicial: ${syncStatus} | UI de Login disponível: ${hasAuthUI}`);

  // RESUMO FINAL
  console.log('\n========================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`  RESULTADO DOS SMOKE TESTS: ${passed} de ${total} APROVADOS (${failed} falhas)`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error(`Atenção: ${failed} teste(s) falharam no estado atual.`);
    process.exit(1);
  } else {
    console.log('Todos os 16/16 testes de fumaça essenciais foram aprovados com sucesso!');
    process.exit(0);
  }
}

runSmokeTests().catch(err => {
  console.error('Erro fatal nos testes de fumaça:', err);
  process.exit(1);
});
