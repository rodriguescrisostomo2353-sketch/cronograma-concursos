import { eventBus } from '../src/core/events.js';
import { getLocalDateString, formatMinutesHuman } from '../src/core/date-utils.js';
import { ErrorBoundary } from '../src/core/error-boundary.js';
import { DataRepository, STORAGE_KEYS } from '../src/data/repository.js';
import { syncQueue } from '../src/sync/sync-queue.js';
import { MateriasFeature } from '../src/features/materias/materias.js';
import { CronogramaFeature } from '../src/features/cronograma/cronograma.js';
import { HorasEstudoFeature } from '../src/features/horas-estudo/horas-estudo.js';

// Mock localStorage para teste isolado
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] ${msg}`);
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
  }
}

console.log('--- TESTANDO MÓDULOS DE ARQUITETURA FRONT-END ---');

// 1. DateUtils
const today = getLocalDateString();
assert(/^\d{4}-\d{2}-\d{2}$/.test(today), `getLocalDateString formato correto: ${today}`);
assert(formatMinutesHuman(90) === '1h 30m', 'formatMinutesHuman(90) -> 1h 30m');

// 2. EventBus
let receivedEvent = null;
eventBus.on('test:event', (data) => { receivedEvent = data; });
eventBus.emit('test:event', { ok: true });
assert(receivedEvent && receivedEvent.ok === true, 'EventBus emite e recebe dados');

// 3. ErrorBoundary
const safeRes = ErrorBoundary.safeRun('TesteMod', () => {
  throw new Error('Erro proposital de teste');
}, (err) => 'recuperado');
assert(safeRes === 'recuperado', 'ErrorBoundary captura erro e executa fallback');

// 4. DataRepository & MateriasFeature
const mat = MateriasFeature.adicionar('Direito Administrativo', ['Ato administrativo', 'Poderes']);
assert(mat && mat.id && mat.nome === 'Direito Administrativo', 'MateriasFeature.adicionar cria matéria normalizada');
assert(mat.topicos.length === 2 && mat.topicos[0].texto === 'Ato administrativo', 'Tópicos normalizados de string para objeto');

const topicoToggled = MateriasFeature.toggleTopico(mat.id, mat.topicos[0].id);
assert(topicoToggled && topicoToggled.concluido === true, 'toggleTopico altera status concluído');

// 5. CronogramaFeature
const crono = CronogramaFeature.criarManual({
  nome: 'Cronograma Modular',
  dias: ['Segunda', 'Quarta'],
  slotsPorDia: 2,
  materias: [mat]
});
assert(crono && crono.columns.length === 2, 'CronogramaFeature cria cronograma manual');

// 6. HorasEstudoFeature
const log = HorasEstudoFeature.registrar({
  materiaId: mat.id,
  materiaNome: mat.nome,
  minutos: 45
});
assert(log && log.minutos === 45, 'HorasEstudoFeature registra sessão');
const metricas = HorasEstudoFeature.obterMetricas();
assert(metricas.totalMinutos === 45 && metricas.sessoesHoje === 1, 'HorasEstudoFeature calcula métricas');

// 7. SyncQueue
syncQueue.enqueue('save', 'Alteração offline teste', { test: 123 });
assert(syncQueue.getPendingCount() === 1, 'SyncQueue enfileira mutações pendentes');
syncQueue.clear();
assert(syncQueue.getPendingCount() === 0, 'SyncQueue limpa fila corretamente');

console.log(`\nRESULTADO MÓDULOS: ${passed}/${total} APROVADOS.`);
if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
