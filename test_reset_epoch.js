/**
 * TESTE DE VALIDAÇÃO DO CONTROLE GERACIONAL POR RESET_EPOCH (Etapa 2.1)
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('========================================================================');
console.log('  TESTES DE VALIDAÇÃO DE CONTROLE GERACIONAL (RESET_EPOCH - ETAPA 2.1)');
console.log('========================================================================\n');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html, {
  url: 'https://rodriguescrisostomo2353-sketch.github.io/cronograma-concursos/',
  pretendToBeVisual: true,
  runScripts: 'dangerously'
});

const { window } = dom;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;

window.scrollTo = () => {};
window.alert = () => {};

const App = window.App;
const SyncManager = window.SyncManager;

App.init();

const results = [];
function check(passed, name, detail = '') {
  results.push({ passed, name });
  const status = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${status} ${name}`);
  if (detail) console.log(`   └─ ${detail}`);
}

async function runResetEpochTests() {
  // Teste 1: Configura estado local e aplica handleServerResetEpoch
  console.log('>> Teste 1: Disparo de nova geração cria backup pré-reset e limpa dados');
  App.data = {
    materias: [
      { id: 'm1', nome: 'Direito Administrativo', topicos: [{ id: 't1', texto: 'Ato Administrativo' }] }
    ],
    naoClassificado: []
  };
  App.schedules = [{ id: 'sch1', title: 'Cronograma 1' }];
  App.studyLog = [{ id: 'log1', minutos: 30, materiaId: 'm1' }];
  SyncManager.resetEpoch = 0;
  localStorage.setItem('concurso_reset_epoch', '0');

  // Simula gravação de mutações offline
  SyncManager.recordOfflineMutation('toggle_topic', 'Tópico 1 estudado', 'topico', 't1', {});
  const queueBefore = SyncManager.offlineQueue.length;

  // Servidor incrementa para epoch 1792000000
  const serverNewEpoch = 1792000000;
  const resetResult = SyncManager.handleServerResetEpoch(serverNewEpoch);

  const backupRaw = localStorage.getItem('concurso_pre_reset_backup');
  const backup = backupRaw ? JSON.parse(backupRaw) : null;
  const queueAfter = SyncManager.offlineQueue.length;
  const localEpochAfter = SyncManager.resetEpoch;
  const matCountAfter = App.data.materias.length;

  const t1Passed = resetResult === true &&
                   backup !== null &&
                   backup.data.materias.length === 1 &&
                   backup.previousEpoch === 0 &&
                   backup.newEpoch === serverNewEpoch &&
                   queueBefore === 1 &&
                   queueAfter === 0 &&
                   localEpochAfter === serverNewEpoch &&
                   matCountAfter === 0;

  check(t1Passed, '1. ResetEpoch: Backup pré-reset gerado, fila offline purgada e dados locais reiniciados',
    `Backup existe: ${!!backup} | Fila offline: ${queueBefore} -> ${queueAfter} | Epoch: ${localEpochAfter} | Matérias: ${matCountAfter}`);

  // Teste 2: Se serverEpoch <= localEpoch, não reseta
  console.log('\n>> Teste 2: Se serverEpoch <= localEpoch, operação de reset é ignorada');
  const ignoredReset = SyncManager.handleServerResetEpoch(serverNewEpoch); // mesmo epoch
  check(!ignoredReset, '2. Idempotência de Epoch: Ignora epochs iguais ou inferiores',
    `Retorno esperado false: ${ignoredReset === false}`);

  // Teste 3: syncDownAndMerge com cloudData contendo reset_epoch superior
  console.log('\n>> Teste 3: syncDownAndMerge com payload contendo reset_epoch mais novo');
  SyncManager.user = { id: 'usr_reset_test', email: 'reset@test.com' };
  SyncManager.client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              user_id: 'usr_reset_test',
              reset_epoch: 1793000000,
              materias: [],
              schedules: [],
              device_id: 'admin_console'
            },
            error: null
          })
        })
      })
    })
  };

  await SyncManager.syncDownAndMerge();
  const epochAfterSync = SyncManager.resetEpoch;
  check(epochAfterSync === 1793000000, '3. syncDownAndMerge: Aplica nova geração e atualiza epoch automaticamente',
    `Epoch sincronizado: ${epochAfterSync}`);

  // Teste 4: gatherPayload embute reset_epoch no payload
  console.log('\n>> Teste 4: gatherPayload inclui reset_epoch');
  const payload = await SyncManager.gatherPayload();
  const payloadHasEpoch = payload.reset_epoch === 1793000000 || (payload.auto_config && payload.auto_config.reset_epoch === 1793000000);
  check(payloadHasEpoch, '4. gatherPayload: Inclui reset_epoch no payload de upload',
    `ResetEpoch no payload: ${payload.reset_epoch}`);

  console.log('\n========================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`  RESULTADO: ${results.filter(r => r.passed).length} de ${results.length} APROVADOS`);
  console.log('========================================================================\n');
  process.exit(allPassed ? 0 : 1);
}

runResetEpochTests();
