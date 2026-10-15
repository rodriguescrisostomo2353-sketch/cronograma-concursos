const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

console.log('====================================================');
console.log('SUÍTE DE TESTES: BIBLIOTECA VIRTUAL, OFFLINE & LAG');
console.log('====================================================\n');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const virtualConsole = new VirtualConsole();
virtualConsole.on('error', () => {});
virtualConsole.on('warn', () => {});

const dom = new JSDOM(html, {
  url: 'https://app.local/',
  pretendToBeVisual: true,
  runScripts: 'dangerously'
});

const { window } = dom;

// Polyfills
window.scrollTo = () => {};
window.alert = () => {};
window.confirm = () => true;

// Mock IndexedDB in JSDOM if needed
if (!window.indexedDB) {
  const fakeStore = new Map();
  window.indexedDB = {
    open(dbName, version) {
      return {
        set onupgradeneeded(fn) {
          fn({ target: { result: {
            objectStoreNames: { contains: () => true },
            createObjectStore: () => {}
          }}});
        },
        set onsuccess(fn) {
          setTimeout(() => fn({ target: { result: {
            objectStoreNames: { contains: () => true },
            transaction: () => ({
              objectStore: (storeName) => ({
                put: (val) => { fakeStore.set(val.id, val); },
                get: (id) => ({ set onsuccess(cb) { cb({ target: { result: fakeStore.get(id) } }); } }),
                getAll: () => ({ set onsuccess(cb) { cb({ target: { result: Array.from(fakeStore.values()) } }); } }),
                delete: (id) => { fakeStore.delete(id); }
              }),
              set oncomplete(cb) { setTimeout(cb, 0); },
              set onerror(cb) {}
            })
          }}}), 0);
        },
        set onerror(fn) {}
      };
    }
  };
}

let passCount = 0;
let failCount = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    if (detail) console.log(`   └─ Detalhe: ${detail}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   └─ Erro: ${detail}`);
    failCount++;
  }
}

// ----------------------------------------------------
// TESTE 1: MÓDULO LibraryManager e DOM da Aba Biblioteca
// ----------------------------------------------------
console.log('--- TESTE 1: ABA BIBLIOTECA VIRTUAL & NAVEGAÇÃO ---');
assert(typeof window.LibraryManager !== 'undefined', 'Objeto LibraryManager existe e está disponível globalmente');
assert(!!window.document.getElementById('tab-library'), 'Elemento da aba #tab-library está presente no DOM');
assert(!!window.document.querySelector('.nav-tab-btn[data-tab="tab-library"]'), 'Botão de navegação da Biblioteca presente nas abas desktop');
assert(!!window.document.getElementById('modalLibraryUpload'), 'Modal de upload para a Biblioteca presente no DOM');
assert(!!window.document.getElementById('modalLibraryEdit'), 'Modal de edição de arquivo presente no DOM');

// Test tab switching to library
const tTab0 = process.hrtime.bigint();
window.App.switchTab('tab-library');
const tTabMs = Number(process.hrtime.bigint() - tTab0) / 1e6;
assert(window.App.activeTab === 'tab-library', 'Navegação para a aba "tab-library" bem-sucedida', `Tempo de troca: ${tTabMs.toFixed(1)} ms`);
assert(window.document.getElementById('tab-library').classList.contains('active'), 'Aba tab-library recebeu a classe active');

// ----------------------------------------------------
// TESTE 2: MODO OFFLINE & FILA DE SINCRONIZAÇÃO (SyncManager)
// ----------------------------------------------------
console.log('\n--- TESTE 2: MODO OFFLINE & FILA DE MUTAÇÕES ---');
assert(typeof window.SyncManager.isOffline === 'function', 'SyncManager possui método isOffline()');
assert(typeof window.SyncManager.toggleForceOffline === 'function', 'SyncManager possui toggleForceOffline()');
assert(typeof window.SyncManager.recordOfflineMutation === 'function', 'SyncManager possui recordOfflineMutation()');
assert(typeof window.SyncManager.flushOfflineQueue === 'function', 'SyncManager possui flushOfflineQueue()');

// Ativa modo offline
window.SyncManager.toggleForceOffline(true);
assert(window.SyncManager.isOffline() === true, 'Modo offline ativado com sucesso via toggleForceOffline(true)');

// Registra mutações offline
window.SyncManager.recordOfflineMutation('toggle_topic', 'Tópico 1.1 concluído offline');
window.SyncManager.recordOfflineMutation('add_study_hours', '30 min de estudo adicionado offline');
assert(window.SyncManager.offlineQueue.length >= 2, 'Fila offline acumulou as mutações registradas', `Itens na fila: ${window.SyncManager.offlineQueue.length}`);

// Desativa modo offline
window.SyncManager.toggleForceOffline(false);
assert(window.SyncManager.forceOffline === false, 'Modo offline desativado via toggleForceOffline(false)');

// ----------------------------------------------------
// TESTE 3: PERFORMANCE ANTI-LAG (LATÊNCIA DE INTERAÇÃO)
// ----------------------------------------------------
console.log('\n--- TESTE 3: DESEMPENHO ANTI-LAG & LATÊNCIA DE INTERAÇÃO ---');

// Carrega matérias de exemplo
window.App.loadDemoData();
assert(window.App.data.materias.length > 0, 'Matérias de exemplo carregadas no App');

// Expande a primeira matéria
const firstMatId = window.App.data.materias[0].id;
window.App.toggleSubjectBody(firstMatId);

// Mede 20 cliques de alternância de tópicos consecutivos
const tClick0 = process.hrtime.bigint();
const iterations = 20;
for (let i = 0; i < iterations; i++) {
  window.StudyHoursManager.toggleTopic(firstMatId, 0);
}
const tClickTotal = Number(process.hrtime.bigint() - tClick0) / 1e6;
const avgPerClick = tClickTotal / iterations;

assert(avgPerClick < 10, 'Latência de clique no checkbox é ultrarrápida (< 10 ms)', `Média: ${avgPerClick.toFixed(2)} ms/clique (Total 20 cliques: ${tClickTotal.toFixed(1)} ms)`);

// Mede troca rápida de abas
const tSwitch0 = process.hrtime.bigint();
window.App.switchTab('tab-schedule');
window.App.switchTab('tab-study-hours');
window.App.switchTab('tab-library');
window.App.switchTab('tab-subjects');
const tSwitchTotal = Number(process.hrtime.bigint() - tSwitch0) / 1e6;
assert(tSwitchTotal < 100, 'Troca sequencial de 4 abas é ultrarrápida (< 100 ms)', `Tempo total: ${tSwitchTotal.toFixed(1)} ms (${(tSwitchTotal/4).toFixed(1)} ms/aba)`);

// ----------------------------------------------------
// RESUMO FINAL
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`RESULTADO: ${passCount} de ${passCount + failCount} testes aprovados!`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
