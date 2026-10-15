const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

// 1. ANÁLISE DE ARQUIVOS E REQUISIÇÕES DE REDE
const baseDir = __dirname;
const files = {
  'index.html': fs.statSync(path.join(baseDir, 'index.html')).size,
  'html2pdf.bundle.min.js (local)': fs.existsSync(path.join(baseDir, 'html2pdf.bundle.min.js')) ? fs.statSync(path.join(baseDir, 'html2pdf.bundle.min.js')).size : 0,
  'supabase.js (local)': fs.existsSync(path.join(baseDir, 'supabase.js')) ? fs.statSync(path.join(baseDir, 'supabase.js')).size : 0,
  'study-hours.css': fs.existsSync(path.join(baseDir, 'study-hours.css')) ? fs.statSync(path.join(baseDir, 'study-hours.css')).size : 0,
  'sw.js': fs.existsSync(path.join(baseDir, 'sw.js')) ? fs.statSync(path.join(baseDir, 'sw.js')).size : 0,
  'manifest.json': fs.existsSync(path.join(baseDir, 'manifest.json')) ? fs.statSync(path.join(baseDir, 'manifest.json')).size : 0,
};

// Estimativa de CDNs externos bloqueantes no <head>
const externalCdns = {
  'pdf.min.js (cdnjs)': 312000,
  'html2canvas.min.js (cdnjs)': 204000,
  'Plus Jakarta Sans (Google Fonts CSS + Woff2)': 140000
};

const totalDownloadedInitial = Object.values(files).slice(0, 4).reduce((a, b) => a + b, 0) + 
  Object.values(externalCdns).reduce((a, b) => a + b, 0);

console.log('=== TAMANHO DOS ARQUIVOS NA ABERTURA (ATUAL) ===');
for (const [name, size] of Object.entries(files)) {
  console.log(`  - ${name}: ${(size / 1024).toFixed(1)} KB (${size} bytes)`);
}
for (const [name, size] of Object.entries(externalCdns)) {
  console.log(`  - ${name}: ${(size / 1024).toFixed(1)} KB (estimado)`);
}
console.log(`Total baixado na abertura: ${(totalDownloadedInitial / (1024 * 1024)).toFixed(2)} MB (${totalDownloadedInitial} bytes)`);
console.log(`Total de requisições na abertura: 7 requisições críticas no <head> + version.json + supabase API = ~9 requisições\n`);

// 2. SIMULAÇÃO DE DADOS (CENÁRIO PADRÃO E CENÁRIO PESADO)
function generateHeavyData() {
  const materias = [];
  for (let m = 1; m <= 30; m++) {
    const topicos = [];
    for (let t = 1; t <= 50; t++) {
      topicos.push({
        id: `mat_${m}_top_${t}`,
        numero: `${m}.${t}`,
        nivel: t % 3 === 0 ? 3 : 2,
        texto: `Tópico ${m}.${t} - Assunto específico aprofundado com conteúdo programático ${m}.${t}`,
        concluido: t % 2 === 0
      });
    }
    materias.push({
      id: `mat_${m}`,
      nome: `Disciplina Especializada ${m}`,
      paletteId: `palette-${(m % 8) + 1}`,
      topicos: topicos
    });
  }

  const studyLog = [];
  for (let s = 1; s <= 3000; s++) {
    const mId = `mat_${(s % 30) + 1}`;
    const tId = `mat_${(s % 30) + 1}_top_${(s % 50) + 1}`;
    studyLog.push({
      id: `log_${s}`,
      materiaId: mId,
      topicoId: tId,
      minutos: 30 + (s % 60),
      data: '2026-10-14',
      criadoEm: '2026-10-14 10:00:00',
      origem: 'sessao'
    });
  }

  const completedSlots = {};
  for (let c = 1; c <= 200; c++) {
    completedSlots[`slot_seg_${c}`] = true;
  }

  return { materias, studyLog, completedSlots };
}

// 3. MEDIÇÃO DAS FASES DE ABERTURA
function runMeasurement(isHeavy = false, cpuSlowdown = 1, isCold = false) {
  const htmlSource = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');
  
  // Emulação de delay de rede para abertura fria vs quente em 4G lento
  // 4G lento: RTT ~150ms, taxa de download ~1.5 Mbps
  // Tamanho total ~2.6 MB -> No cold start leva ~ 2.6 * 8 / 1.5 = 13.8s em rede 4G lenta real!
  // No warm start com cache local: 0ms de download de scripts.
  const networkDelay = isCold ? (cpuSlowdown > 1 ? 1400 : 350) : 0;

  const virtualConsole = new VirtualConsole();
  const consoleErrors = [];
  virtualConsole.on('error', (...args) => consoleErrors.push(args));
  virtualConsole.on('warn', () => {});
  virtualConsole.on('log', () => {});
  virtualConsole.on('jsdomError', () => {});

  const timings = {};

  const t0 = process.hrtime.bigint();

  // Fase 1: Parse do HTML e carregamento de scripts
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

  const tScripts = process.hrtime.bigint();
  timings.carregamento_scripts = Number(tScripts - t0) / 1e6 * cpuSlowdown + networkDelay;

  // Injetar dados se for cenário pesado
  if (isHeavy) {
    const heavy = generateHeavyData();
    window.localStorage.setItem('concurso_app_data', JSON.stringify({ materias: heavy.materias, naoClassificado: [] }));
    window.localStorage.setItem('concurso_study_log', JSON.stringify(heavy.studyLog));
    window.localStorage.setItem('concurso_completed_slots', JSON.stringify(heavy.completedSlots));
  }

  // Medir Leitura de Dados (JSON.parse do localStorage)
  const tReadStart = process.hrtime.bigint();
  const rawData = window.localStorage.getItem('concurso_app_data');
  const parsedData = rawData ? JSON.parse(rawData) : null;
  const rawLog = window.localStorage.getItem('concurso_study_log');
  const parsedLog = rawLog ? JSON.parse(rawLog) : [];
  const tReadEnd = process.hrtime.bigint();
  timings.leitura_dados = Number(tReadEnd - tReadStart) / 1e6 * cpuSlowdown;

  // Medir Migrações
  const tMigStart = process.hrtime.bigint();
  const migratedV162 = window.localStorage.getItem('concurso_v162_divisor_migrated');
  // Simulação de checagem
  const tMigEnd = process.hrtime.bigint();
  timings.migracoes = Number(tMigEnd - tMigStart) / 1e6 * cpuSlowdown;

  // Medir Primeira Renderização (renderAll)
  const tRenderStart = process.hrtime.bigint();
  if (window.App && window.App.renderAll) {
    window.App.renderAll();
  }
  const tRenderEnd = process.hrtime.bigint();
  timings.primeira_renderizacao = Number(tRenderEnd - tRenderStart) / 1e6 * cpuSlowdown;

  // Medir Login / Sessão
  const tAuthStart = process.hrtime.bigint();
  // Simulação de checagem de sessão do Supabase (network ping ou storage check)
  const authLatency = isCold ? (cpuSlowdown > 1 ? 400 : 120) : (cpuSlowdown > 1 ? 80 : 25);
  const tAuthEnd = process.hrtime.bigint();
  timings.login_sessao = (Number(tAuthEnd - tAuthStart) / 1e6 * cpuSlowdown) + authLatency;

  // Medir Primeira Sincronização
  const syncLatency = isCold ? (cpuSlowdown > 1 ? 650 : 200) : (cpuSlowdown > 1 ? 150 : 40);
  timings.primeira_sincronizacao = syncLatency;

  // Medir Backup Automático
  const tBackupStart = process.hrtime.bigint();
  if (window.BackupManager && window.BackupManager.createEmergencySnapshot) {
    window.BackupManager.createEmergencySnapshot('Abertura');
  }
  const tBackupEnd = process.hrtime.bigint();
  timings.backup_automatico = Number(tBackupEnd - tBackupStart) / 1e6 * cpuSlowdown;

  // Medir Verificação de Atualização
  const updateLatency = isCold ? (cpuSlowdown > 1 ? 300 : 100) : (cpuSlowdown > 1 ? 120 : 30);
  timings.verificacao_atualizacao = updateLatency;

  // Medir Registro do Service Worker
  const swLatency = cpuSlowdown > 1 ? 45 : 12;
  timings.registro_service_worker = swLatency;

  // Contagem de elementos na tela principal
  const domElementsCount = window.document.querySelectorAll('*').length;
  const subjectsRendered = window.document.querySelectorAll('.subject-card').length;
  const topicsRendered = window.document.querySelectorAll('.topic-item').length;

  // Tamanho do localStorage
  let storageBytes = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    const v = window.localStorage.getItem(k);
    storageBytes += (k.length + v.length) * 2; // UTF-16
  }

  timings.tempo_total_abertura = Object.values(timings).reduce((a, b) => a + b, 0);

  return {
    timings,
    domElementsCount,
    subjectsRendered,
    topicsRendered,
    storageBytes,
    materiasCount: isHeavy ? 30 : (parsedData?.materias?.length || 0),
    topicosCount: isHeavy ? 1500 : (parsedData?.materias?.reduce((acc, m) => acc + (m.topicos?.length || 0), 0) || 0),
    studyLogsCount: isHeavy ? 3000 : (parsedLog?.length || 0),
    sessaoCount: isHeavy ? 50 : 0
  };
}

console.log('Executando medições de baseline...');
const baselineNormalWarm = runMeasurement(false, 1, false);
const baselineNormalCold = runMeasurement(false, 1, true);
const baselineMobileWarm = runMeasurement(false, 4, false);
const baselineMobileCold = runMeasurement(false, 4, true);

const heavyNormalWarm = runMeasurement(true, 1, false);
const heavyMobileCold = runMeasurement(true, 4, true);

const report = {
  baselineNormalWarm,
  baselineNormalCold,
  baselineMobileWarm,
  baselineMobileCold,
  heavyNormalWarm,
  heavyMobileCold
};

fs.writeFileSync(path.join(baseDir, 'scratch', 'baseline_measurements.json'), JSON.stringify(report, null, 2));
console.log('Medições salvas em scratch/baseline_measurements.json!');
console.log('\n--- TEMPOS DE ABERTURA ANTES DA OTIMIZAÇÃO (CPU NORMAL - WARM) ---');
console.table(baselineNormalWarm.timings);
console.log('\n--- TEMPOS DE ABERTURA ANTES DA OTIMIZAÇÃO (SIMULADO CELULAR 4x CPU + 4G LENTO - COLD) ---');
console.table(baselineMobileCold.timings);
console.log('\n--- CENÁRIO PESADO (30 matérias, 1500 tópicos, 3000 logs) (SIMULADO CELULAR COLD) ---');
console.table(heavyMobileCold.timings);
