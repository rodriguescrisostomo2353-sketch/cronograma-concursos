/**
 * SUÍTE COMPLETA DE PROVAS DE FUNCIONAMENTO ANTI-DUPLICAÇÃO (Etapa 1.6)
 * Valida os 8 cenários obrigatórios de integridade e o teste de estresse com 20.000 tópicos.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

console.log('========================================================================');
console.log('  SUÍTE DE PROVAS DE FUNCIONAMENTO ANTI-DUPLICAÇÃO (ETAPA 1.6)');
console.log('========================================================================\n');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Mock IndexedDB store
const fakeDbStore = new Map();
const fakeIndexedDB = {
  open(dbName, version) {
    let onupgradeneededFn = null;
    let onsuccessFn = null;
    const request = {
      set onblocked(fn) {},
      set onupgradeneeded(fn) { onupgradeneededFn = fn; },
      set onsuccess(fn) { onsuccessFn = fn; },
      set onerror(fn) {}
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
      if (onupgradeneededFn) onupgradeneededFn({ target: { result: db } });
      if (onsuccessFn) onsuccessFn({ target: { result: db } });
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
global.localStorage = window.localStorage;

window.scrollTo = () => {};
window.alert = () => {};
window.confirm = () => true;

const App = window.App;
const SyncManager = window.SyncManager;
const IdUtils = window.IdUtils;
const DataRepository = window.DataRepository;

const results = [];
function check(passed, name, detail = '') {
  results.push({ passed, name, detail });
  const status = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${status} ${name}`);
  if (detail) console.log(`   └─ ${detail}`);
}

async function runAntiDuplicationSuite() {
  console.log('--- INICIANDO EXECUÇÃO DOS 8 CENÁRIOS ANTI-DUPLICAÇÃO ---\n');

  // Inicializa o App
  App.init();

  // ========================================================================
  // CENÁRIO 1: Reimportar/reprocessar o mesmo edital 10 vezes seguidas
  // ========================================================================
  console.log('>> Cenário 1: Reimportar/reprocessar o mesmo edital 10 vezes seguidas');
  const editalExemplo = [
    'DIREITO CONSTITUCIONAL: 1. Direitos e garantias fundamentais.',
    '2. Direitos sociais.',
    '3. Nacionalidade.',
    '4. Direitos políticos.',
    'LÍNGUA PORTUGUESA: 1. Compreensão e interpretação de textos.',
    '2. Ortografia oficial.',
    '3. Acentuação gráfica.'
  ];

  // Primeira importação
  const res1 = window.App.parseEditalText(editalExemplo);
  const materiasIniciais = res1 ? res1.materias : [];
  const countMat1 = materiasIniciais.length;
  const countTop1 = materiasIniciais.reduce((acc, m) => acc + m.topicos.length, 0);

  // Executa 10 reprocessamentos consecutivos
  let countMatFinal = 0;
  let countTopFinal = 0;
  for (let i = 0; i < 10; i++) {
    const parsed = window.App.parseEditalText(editalExemplo);
    countMatFinal = parsed ? parsed.materias.length : 0;
    countTopFinal = parsed ? parsed.materias.reduce((acc, m) => acc + m.topicos.length, 0) : 0;
  }

  const c1Passed = (countMatFinal === countMat1) && (countTopFinal === countTop1) && (countMat1 === 2) && (countTopFinal >= 2);
  check(c1Passed, 'Cenário 1: Reprocessamento de edital 10 vezes mantém contagem rigorosamente constante',
    `Matérias: ${countMatFinal}/${countMat1} | Tópicos: ${countTopFinal}/${countTop1} (Zero duplicações)`
  );

  // ========================================================================
  // CENÁRIO 2: Abrir e fechar o app 20 vezes consecutivas
  // ========================================================================
  console.log('\n>> Cenário 2: Abrir e fechar o app 20 vezes consecutivas (ciclo de vida e renderização)');
  // Salva estado inicial estável de forma síncrona
  App.data = { materias: materiasIniciais, naoClassificado: [] };
  App._doSaveToStorage(false);

  const initialItemsCount = App.data.materias.reduce((acc, m) => acc + m.topicos.length, 0);

  // Simula 20 aberturas e reinicializações
  for (let i = 0; i < 20; i++) {
    App.loadFromStorage();
    App.renderAll();
    App._doSaveToStorage(false);
  }

  const finalItemsCount = App.data.materias.reduce((acc, m) => acc + m.topicos.length, 0);
  const c2Passed = (initialItemsCount === finalItemsCount) && (finalItemsCount === countTop1) && (finalItemsCount >= 2);
  check(c2Passed, 'Cenário 2: 20 ciclos consecutivos de abertura e renderização não geram duplicados',
    `Tópicos antes: ${initialItemsCount} | Tópicos depois: ${finalItemsCount}`
  );

  // ========================================================================
  // CENÁRIO 3: Dois dispositivos editando ao mesmo tempo (simulação de 2 sessões)
  // ========================================================================
  console.log('\n>> Cenário 3: Dois dispositivos editando ao mesmo tempo (sessão dupla)');
  // Dispositivo A tem matéria com tópico 1 concluído
  const payloadDevA = {
    materias: [
      {
        id: IdUtils.getMateriaId('Direito Constitucional'),
        nome: 'Direito Constitucional',
        topicos: [
          { id: IdUtils.getTopicoId('Direito Constitucional', 1, 'Direitos fundamentais'), texto: 'Direitos fundamentais', concluido: true },
          { id: IdUtils.getTopicoId('Direito Constitucional', 2, 'Direitos sociais'), texto: 'Direitos sociais', concluido: false }
        ]
      }
    ],
    schedules: [],
    study_log: []
  };

  // Dispositivo B tem a mesma matéria, mas concluiu o tópico 2 e adicionou anotação
  const payloadDevB = {
    materias: [
      {
        id: IdUtils.getMateriaId('Direito Constitucional'),
        nome: 'Direito Constitucional',
        topicos: [
          { id: IdUtils.getTopicoId('Direito Constitucional', 1, 'Direitos fundamentais'), texto: 'Direitos fundamentais', concluido: false },
          { id: IdUtils.getTopicoId('Direito Constitucional', 2, 'Direitos sociais'), texto: 'Direitos sociais', concluido: true, anotacoes: 'Revisado via mobile' },
          { id: IdUtils.getTopicoId('Direito Constitucional', 3, 'Nacionalidade'), texto: 'Nacionalidade', concluido: false }
        ]
      }
    ],
    schedules: [],
    study_log: []
  };

  const mergedAB = SyncManager.mergePayloads(payloadDevA, payloadDevB);
  const constMat = mergedAB.materias.find(m => m.nome === 'Direito Constitucional');
  const t1 = constMat.topicos.find(t => t.texto.includes('fundamentais'));
  const t2 = constMat.topicos.find(t => t.texto.includes('sociais'));
  const t3 = constMat.topicos.find(t => t.texto.includes('Nacionalidade'));

  const c3Passed = (mergedAB.materias.length === 1) &&
                   (constMat.topicos.length === 3) &&
                   (t1 && t1.concluido === true) &&
                   (t2 && t2.concluido === true) &&
                   (t3 !== undefined);

  check(c3Passed, 'Cenário 3: Mesclagem simultânea de 2 dispositivos preserva conclusões sem duplicar matérias/tópicos',
    `Matérias: ${mergedAB.materias.length} | Tópicos resultantes: ${constMat.topicos.length} | T1 concluído: ${t1.concluido} | T2 concluído: ${t2.concluido}`
  );

  // ========================================================================
  // CENÁRIO 4: Queda de rede no meio da gravação com outbox e retry
  // ========================================================================
  console.log('\n>> Cenário 4: Queda de rede no meio da gravação com outbox e retry');
  SyncManager.user = { id: 'usr_test_proof', email: 'teste@proof.com' };
  SyncManager.client = {
    from: () => ({
      upsert: async () => ({ error: null })
    })
  };
  SyncManager.forceOffline = true;
  SyncManager.offlineQueue = [];
  localStorage.removeItem('concurso_offline_mutation_queue');

  // Grava mutação em modo offline
  SyncManager.recordOfflineMutation('toggle_topic', 'Tópico 1 concluído offline', 'topico', 'top-const-1', { id: 'top-const-1', done: true });
  const filaGravada = SyncManager.offlineQueue.length;

  // Simula retry com falha (permanece offline)
  await SyncManager.flushOfflineQueue();
  const filaAposFalha = SyncManager.offlineQueue.length;

  // Reconecta a rede e executa flush com sucesso
  SyncManager.forceOffline = false;
  let uploadExecutado = 0;
  const originalUpsert = SyncManager.upsertUserData;
  SyncManager.upsertUserData = async () => {
    uploadExecutado++;
    return { data: {}, error: null };
  };

  await SyncManager.flushOfflineQueue();
  const filaAposSucesso = SyncManager.offlineQueue.length;
  SyncManager.upsertUserData = originalUpsert;

  const c4Passed = (filaGravada === 1) && (filaAposFalha === 1) && (filaAposSucesso === 0) && (uploadExecutado === 1);
  check(c4Passed, 'Cenário 4: Queda de rede retém operação na outbox e retry executa exatamente 1 gravação final',
    `Fila antes: ${filaGravada} | Fila após falha: ${filaAposFalha} | Fila após sucesso: ${filaAposSucesso} | Uploads: ${uploadExecutado}`
  );

  // ========================================================================
  // CENÁRIO 5: Longo período offline, 15 alterações consecutivas e reconexão
  // ========================================================================
  console.log('\n>> Cenário 5: Longo período offline, 15 alterações e compactação de fila');
  SyncManager.forceOffline = true;
  SyncManager.offlineQueue = [];

  // Gera 15 mutações offline (10 no tópico 'top-1' e 5 no 'app_state')
  for (let i = 1; i <= 15; i++) {
    const isState = (i % 3 === 0);
    const entType = isState ? 'save_state' : 'topico';
    const entId = isState ? 'global' : 'top-1';
    SyncManager.offlineQueue.push({
      opId: `op_${entType}_${entId}`,
      entityType: entType,
      entityId: entId,
      type: isState ? 'save_state' : 'toggle_topic',
      desc: `Operação ${i}`,
      timestamp: Date.now() + i
    });
  }

  const totalAntesCompactar = SyncManager.offlineQueue.length;
  SyncManager.compactOfflineQueue();
  const totalAposCompactar = SyncManager.offlineQueue.length;

  const c5Passed = (totalAntesCompactar === 15) && (totalAposCompactar === 2);
  check(c5Passed, 'Cenário 5: Fila offline compacta 15 mutações redundantes para operações idempotentes',
    `Mutações brutas: ${totalAntesCompactar} -> Mutações compactadas: ${totalAposCompactar}`
  );
  SyncManager.forceOffline = false;
  SyncManager.offlineQueue = [];

  // ========================================================================
  // CENÁRIO 6: Primeiro login após uso local prévio + mesclagem repetida
  // ========================================================================
  console.log('\n>> Cenário 6: Primeiro login após uso local prévio + idempotência de mesclagem repetida');
  const localParaLogin = {
    materias: [
      { id: 'mat-lp', nome: 'Língua Portuguesa', topicos: [{ id: 'top-lp-1', texto: 'Ortografia', concluido: true }] }
    ],
    nao_classificado: ['Anotação solta 1'],
    schedules: [{ id: 'sched-1', name: 'Ciclo 1', columns: [] }],
    study_log: [{ id: 'log-1', data: '2026-10-15', materiaId: 'mat-lp', minutos: 30 }]
  };

  const cloudExistente = {
    materias: [
      { id: 'mat-lp', nome: 'Língua Portuguesa', topicos: [{ id: 'top-lp-1', texto: 'Ortografia', concluido: true }, { id: 'top-lp-2', texto: 'Sintaxe', concluido: false }] },
      { id: 'mat-rlm', nome: 'Raciocínio Lógico', topicos: [{ id: 'top-rlm-1', texto: 'Tautologia', concluido: false }] }
    ],
    nao_classificado: ['Anotação solta 1', 'Anotação nuvem 2'],
    schedules: [{ id: 'sched-1', name: 'Ciclo 1', columns: [] }],
    study_log: [{ id: 'log-1', data: '2026-10-15', materiaId: 'mat-lp', minutos: 30 }]
  };

  // Primeira mesclagem
  const merge1 = SyncManager.mergePayloads(localParaLogin, cloudExistente);
  const countMatMerge1 = merge1.materias.length;
  const countTopMerge1 = merge1.materias.reduce((acc, m) => acc + m.topicos.length, 0);
  const countNcMerge1 = merge1.nao_classificado.length;
  const countLogMerge1 = (merge1.study_log || []).length;

  // Segunda mesclagem (repetindo sobre o resultado já mesclado)
  const merge2 = SyncManager.mergePayloads(merge1, cloudExistente);
  const countMatMerge2 = merge2.materias.length;
  const countTopMerge2 = merge2.materias.reduce((acc, m) => acc + m.topicos.length, 0);
  const countNcMerge2 = merge2.nao_classificado.length;
  const countLogMerge2 = (merge2.study_log || []).length;

  const c6Passed = (countMatMerge1 === 2) && (countTopMerge1 === 3) && (countNcMerge1 === 2) && (countLogMerge1 === 1) &&
                   (countMatMerge1 === countMatMerge2) && (countTopMerge1 === countTopMerge2) &&
                   (countNcMerge1 === countNcMerge2) && (countLogMerge1 === countLogMerge2);

  check(c6Passed, 'Cenário 6: Primeiro login une dados locais e nuvem com idempotência total em mesclagens repetidas',
    `Matérias: ${countMatMerge1} | Tópicos: ${countTopMerge1} | Não classificados: ${countNcMerge1} | Logs: ${countLogMerge1} (Idêntico na repetição)`
  );

  // ========================================================================
  // CENÁRIO 7: Marcar e desmarcar tópicos repetidamente
  // ========================================================================
  console.log('\n>> Cenário 7: Marcar e desmarcar tópicos repetidamente sem duplicar logs');
  const materiaId = IdUtils.getMateriaId('Direito Administrativo');
  const topicoId = IdUtils.getTopicoId('Direito Administrativo', 1, 'Princípios');

  App.data.materias = [
    {
      id: materiaId,
      nome: 'Direito Administrativo',
      topicos: [{ id: topicoId, texto: 'Princípios', concluido: false }]
    }
  ];
  App.studyLog = [];

  // Alterna 10 vezes (false -> true -> false -> true ...)
  window.StudyHoursManager.autoQuickMark = true;
  for (let i = 0; i < 10; i++) {
    window.StudyHoursManager.toggleTopic(materiaId, 0);
  }

  const statusFinalTopico = App.data.materias[0].topicos[0].concluido;
  // Registra sessão de estudo com ID determinístico
  window.StudyHoursManager.addLogEntry({
    materiaId: materiaId,
    materiaNome: 'Direito Administrativo',
    topicoId: topicoId,
    topicoNome: 'Princípios',
    minutos: 25,
    origem: 'manual'
  });

  // Tenta registrar novamente exatamente a mesma sessão (duplicação proposital simulada)
  const logInicial = App.studyLog.length;
  window.StudyHoursManager.addLogEntry({
    id: App.studyLog[0].id, // Mesmo ID determinístico
    materiaId: materiaId,
    materiaNome: 'Direito Administrativo',
    topicoId: topicoId,
    topicoNome: 'Princípios',
    minutos: 25,
    origem: 'manual'
  });
  const logFinal = App.studyLog.length;

  const c7Passed = (statusFinalTopico === false) && (logInicial === 1) && (logFinal === 1);
  check(c7Passed, 'Cenário 7: Alternância repetida preserva consistência de estado e previne duplicação de logs',
    `Status final após 10 toggles: ${statusFinalTopico} | Logs de estudo: ${logFinal} (Zero duplicados)`
  );

  // ========================================================================
  // CENÁRIO 8: Teste do Disjuntor / Limites de Segurança (Circuit Breaker)
  // ========================================================================
  console.log('\n>> Cenário 8: Disjuntor de segurança bloqueia sincronização ao detectar crescimento explosivo');
  const baseLocal = {
    materias: [
      { id: 'm1', nome: 'Materia 1', topicos: Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, texto: `Topico ${i}` })) }
    ],
    schedules: [],
    study_log: []
  };

  // Simula payload anômalo vindo da nuvem com 800 tópicos extras (+1600%, > 500 itens)
  const payloadExplosivo = {
    materias: [
      { id: 'm1', nome: 'Materia 1', topicos: Array.from({ length: 850 }, (_, i) => ({ id: `t_corrompido_${i}`, texto: `Topico Fantasma ${i}` })) }
    ],
    schedules: [],
    study_log: []
  };

  const breakerTriggered = SyncManager.checkCircuitBreaker(baseLocal, payloadExplosivo);
  const trippedFlag = SyncManager.circuitBreakerTripped;
  const reasonMsg = SyncManager.circuitBreakerDiagnostic ? SyncManager.circuitBreakerDiagnostic.reason : '';

  // Testa desbloqueio manual / override
  SyncManager.resetCircuitBreaker();
  const resetFlag = SyncManager.circuitBreakerTripped;

  const c8Passed = (breakerTriggered.ok === false) &&
                   (trippedFlag === true) &&
                   (breakerTriggered.delta > 500) &&
                   (resetFlag === false);

  check(c8Passed, 'Cenário 8: Disjuntor dispara em crescimento anômalo (>20% e >500 itens) e permite desbloqueio seguro',
    `Disparou: ${!breakerTriggered.ok} | Delta: +${breakerTriggered.delta} itens | Motivo: "${reasonMsg.substring(0, 50)}..." | Reset: OK`
  );

  // ========================================================================
  // TESTE DE ESTRESSE: MASSA COM 20.000 TÓPICOS
  // ========================================================================
  console.log('\n========================================================================');
  console.log('  TESTE DE ESTRESSE: SINCRONIZAÇÃO E MESCLAGEM COM 20.000 TÓPICOS');
  console.log('========================================================================');

  const heapStart = process.memoryUsage().heapUsed / 1024 / 1024;
  const tStart = Date.now();

  // Gera 20 matérias com 1.000 tópicos cada = 20.000 tópicos
  const materiasEstresseLocal = [];
  const materiasEstresseCloud = [];

  for (let m = 1; m <= 20; m++) {
    const nomeMat = `Disciplina Estresse ${m}`;
    const topicosLocal = [];
    const topicosCloud = [];

    for (let t = 1; t <= 1000; t++) {
      const topId = IdUtils.getTopicoId(nomeMat, t, `Tópico de Estresse ${t}`);
      topicosLocal.push({
        id: topId,
        numero: t,
        texto: `Tópico de Estresse ${t}`,
        concluido: (t % 2 === 0)
      });

      // Nuvem contém os mesmos tópicos + conclusões adicionais nos ímpares
      topicosCloud.push({
        id: topId,
        numero: t,
        texto: `Tópico de Estresse ${t}`,
        concluido: (t % 3 === 0)
      });
    }

    materiasEstresseLocal.push({
      id: IdUtils.getMateriaId(nomeMat),
      nome: nomeMat,
      topicos: topicosLocal
    });

    materiasEstresseCloud.push({
      id: IdUtils.getMateriaId(nomeMat),
      nome: nomeMat,
      topicos: topicosCloud
    });
  }

  const payloadEstresseLocal = { materias: materiasEstresseLocal, schedules: [], study_log: [] };
  const payloadEstresseCloud = { materias: materiasEstresseCloud, schedules: [], study_log: [] };

  const tGeneration = Date.now() - tStart;
  console.log(`[Estresse] 20.000 tópicos gerados em ${tGeneration} ms`);

  // Executa a mesclagem dos 20.000 tópicos
  const tMergeStart = Date.now();
  const payloadEstresseMerged = SyncManager.mergePayloads(payloadEstresseLocal, payloadEstresseCloud);
  const tMergeDuration = Date.now() - tMergeStart;

  const heapEnd = process.memoryUsage().heapUsed / 1024 / 1024;
  const heapDelta = (heapEnd - heapStart).toFixed(2);

  const totalMateriasEstresse = payloadEstresseMerged.materias.length;
  const totalTopicosEstresse = payloadEstresseMerged.materias.reduce((acc, m) => acc + m.topicos.length, 0);

  // Validação estrita
  const stressPassed = (totalMateriasEstresse === 20) &&
                       (totalTopicosEstresse === 20000) &&
                       (tMergeDuration < 5000); // Orçamento de performance: < 5 segundos para 20.000 itens

  check(stressPassed, 'Teste de Estresse: Mesclagem completa de 20.000 tópicos sem duplicar e dentro do orçamento de performance',
    `Matérias: ${totalMateriasEstresse}/20 | Tópicos: ${totalTopicosEstresse}/20.000 | Tempo: ${tMergeDuration} ms | Consumo Heap: +${heapDelta} MB`
  );

  // ========================================================================
  // RELATÓRIO FINAL
  // ========================================================================
  console.log('\n========================================================================');
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`  RESULTADO DA SUÍTE: ${passedTests} de ${totalTests} APROVADOS (${failedTests} falhas)`);
  console.log('========================================================================\n');

  if (failedTests === 0) {
    console.log('🎉 TODOS OS CENÁRIOS ANTI-DUPLICAÇÃO E TESTE DE ESTRESSE FORAM APROVADOS COM ÊXITO TOTAL!');
    process.exit(0);
  } else {
    console.error('❌ Falhas encontradas na suíte de testes anti-duplicação.');
    process.exit(1);
  }
}

runAntiDuplicationSuite().catch(err => {
  console.error('Erro fatal ao executar a suíte anti-duplicação:', err);
  process.exit(1);
});
