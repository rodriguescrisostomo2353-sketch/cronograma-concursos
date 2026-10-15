const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

console.log('Testing runDeferredTasks in JSDOM...');

const virtualConsole = new VirtualConsole();
virtualConsole.on('error', (...args) => console.error('[BROWSER ERROR]:', ...args));
virtualConsole.on('warn', (...args) => console.warn('[BROWSER WARN]:', ...args));
virtualConsole.on('log', (...args) => console.log('[BROWSER LOG]:', ...args));

const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  url: 'https://rodriguescrisostomo2353-sketch.github.io/cronograma-concursos/',
  runScripts: 'dangerously',
  resources: 'usable',
  virtualConsole,
  pretendToBeVisual: true
});

const { window } = dom;

// Seed user data matching the screenshot!
const userData = {
  materias: [
    {
      id: 'mat-1',
      nome: 'LÍNGUA PORTUGUESA',
      paletteId: 'blue',
      topicos: Array.from({ length: 16 }, (_, i) => ({ id: `top-lp-${i}`, texto: `1.${i + 1} Tópico de Português ${i + 1}`, concluido: false }))
    },
    {
      id: 'mat-2',
      nome: 'RACIOCÍNIO LÓGICO-MATEMÁTICO',
      paletteId: 'purple',
      topicos: Array.from({ length: 12 }, (_, i) => ({ id: `top-rlm-${i}`, texto: `2.${i + 1} Tópico de Raciocínio ${i + 1}`, concluido: false }))
    },
    {
      id: 'mat-3',
      nome: 'ESTATÍSTICA',
      paletteId: 'emerald',
      topicos: Array.from({ length: 3 }, (_, i) => ({ id: `top-est-${i}`, texto: `3.${i + 1} Tópico de Estatística ${i + 1}`, concluido: false }))
    },
    {
      id: 'mat-4',
      nome: 'INFORMÁTICA BÁSICA',
      paletteId: 'cyan',
      topicos: Array.from({ length: 12 }, (_, i) => ({ id: `top-inf-${i}`, texto: `4.${i + 1} Tópico de Informática ${i + 1}`, concluido: false }))
    },
    {
      id: 'mat-5',
      nome: 'CONHECIMENTOS ESPECÍFICOS',
      paletteId: 'rose',
      topicos: []
    },
    {
      id: 'mat-6',
      nome: 'NOÇÕES DE DIREITO ADMINISTRATIVO',
      paletteId: 'amber',
      topicos: Array.from({ length: 24 }, (_, i) => ({ id: `top-da-${i}`, texto: `5.${i + 1} Tópico de Direito Administrativo ${i + 1}`, concluido: false }))
    }
  ],
  naoClassificado: []
};

window.localStorage.setItem('concurso_app_data', JSON.stringify(userData));

setTimeout(async () => {
  console.log('App initialized. Now running App.init() again with user data...');
  window.App.init();

  console.log('App loaded subjects:', window.App.data.materias.length);

  // Let's test each deferred task individually and measure execution time and memory!
  console.log('Testing deferred tasks...');
  const initialMem = process.memoryUsage().heapUsed;

  console.log('1. Checking dividingMateriasSalvasPorNumeracao...');
  try {
    const res = window.App.dividirMateriasSalvasPorNumeracao(true);
    console.log('dividirMateriasSalvasPorNumeracao result:', res);
  } catch (e) {
    console.error('Error in dividirMateriasSalvasPorNumeracao:', e);
  }

  console.log('2. Checking LibraryManager.init()...');
  try {
    if (window.LibraryManager) {
      await window.LibraryManager.init();
      console.log('LibraryManager initialized. Files count:', window.LibraryManager.files.length);
    }
  } catch (e) {
    console.error('Error in LibraryManager.init():', e);
  }

  console.log('3. Checking SyncManager.init()...');
  try {
    if (window.SyncManager) {
      await window.SyncManager.init();
      console.log('SyncManager initialized. Status:', window.SyncManager.syncStatus);
    }
  } catch (e) {
    console.error('Error in SyncManager.init():', e);
  }

  console.log('4. Checking BackupManager.init()...');
  try {
    if (window.BackupManager) {
      window.BackupManager.init();
      console.log('BackupManager initialized.');
    }
  } catch (e) {
    console.error('Error in BackupManager.init():', e);
  }

  console.log('5. Checking checkUpdates(false)...');
  try {
    await window.App.checkUpdates(false);
    console.log('checkUpdates finished.');
  } catch (e) {
    console.error('Error in checkUpdates:', e);
  }

  const finalMem = process.memoryUsage().heapUsed;
  console.log('Memory delta (MB):', ((finalMem - initialMem) / 1024 / 1024).toFixed(2));
}, 1000);
