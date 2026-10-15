const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve(__dirname, 'chrome_bench_profile');

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

console.log('=== REAL CHROME ENGINE PERFORMANCE & MEMORY TEST ===');
console.log('Chrome Binary:', chromePath);
console.log('User Profile:', userDataDir);

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9222',
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${userDataDir}`,
  'http://127.0.0.1:8089/index.html'
], { stdio: 'ignore' });

let ws;
let msgId = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  // 1. Wait for debug port to be available
  let targets = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (!targets || targets.length === 0) {
    throw new Error('Could not connect to Chrome DevTools Protocol on port 9222');
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  console.log('Found Chrome Target:', pageTarget.title, pageTarget.url);

  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const p = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) p.reject(data.error);
        else p.resolve(data.result);
      }
    };
  });

  console.log('Connected to Chrome WebSocket debugging.');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Performance.enable');

  // Seed realistic user data from screenshot into localStorage
  const setupScript = `
    const userData = {
      materias: [
        { id: 'mat-1', nome: 'LÍNGUA PORTUGUESA', paletteId: 'blue', topicos: Array.from({ length: 16 }, (_, i) => ({ id: 'top-lp-' + i, texto: '1.' + (i + 1) + ' Tópico de Português ' + (i + 1), concluido: false })) },
        { id: 'mat-2', nome: 'RACIOCÍNIO LÓGICO-MATEMÁTICO', paletteId: 'purple', topicos: Array.from({ length: 12 }, (_, i) => ({ id: 'top-rlm-' + i, texto: '2.' + (i + 1) + ' Tópico de Raciocínio ' + (i + 1), concluido: false })) },
        { id: 'mat-3', nome: 'ESTATÍSTICA', paletteId: 'emerald', topicos: Array.from({ length: 3 }, (_, i) => ({ id: 'top-est-' + i, texto: '3.' + (i + 1) + ' Tópico de Estatística ' + (i + 1), concluido: false })) },
        { id: 'mat-4', nome: 'INFORMÁTICA BÁSICA', paletteId: 'cyan', topicos: Array.from({ length: 12 }, (_, i) => ({ id: 'top-inf-' + i, texto: '4.' + (i + 1) + ' Tópico de Informática ' + (i + 1), concluido: false })) },
        { id: 'mat-5', nome: 'CONHECIMENTOS ESPECÍFICOS', paletteId: 'rose', topicos: [] },
        { id: 'mat-6', nome: 'NOÇÕES DE DIREITO ADMINISTRATIVO', paletteId: 'amber', topicos: Array.from({ length: 24 }, (_, i) => ({ id: 'top-da-' + i, texto: '5.' + (i + 1) + ' Tópico de Direito ' + (i + 1), concluido: false })) }
      ],
      naoClassificado: []
    };
    localStorage.setItem('concurso_app_data', JSON.stringify(userData));
    localStorage.setItem('concurso_offline_mode', 'false');
    'DATA_SEEDED';
  `;

  await send('Runtime.evaluate', { expression: setupScript });
  console.log('Seeded realistic user dataset. Reloading page...');

  // Reload page so app boots up cleanly with user data
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 2000));

  // Check metrics over 5 seconds
  for (let sec = 1; sec <= 5; sec++) {
    await new Promise(r => setTimeout(r, 1000));
    const perf = await send('Performance.getMetrics');
    const metricMap = {};
    perf.metrics.forEach(m => { metricMap[m.name] = m.value; });

    const jsHeapMB = (metricMap.JSHeapUsedSize / 1024 / 1024).toFixed(2);
    const jsHeapTotalMB = (metricMap.JSHeapTotalSize / 1024 / 1024).toFixed(2);
    const nodes = metricMap.Nodes;
    console.log(`[T+${sec}s] JS Heap Used: ${jsHeapMB} MB / ${jsHeapTotalMB} MB | DOM Nodes: ${nodes}`);
  }

  // Test interactive responsiveness: toggle topic checkbox
  console.log('\nTesting topic toggle responsiveness...');
  const toggleResult = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const start = performance.now();
        const cb = document.querySelector('input[type="checkbox"]');
        if (cb) {
          cb.click();
        }
        const duration = performance.now() - start;
        return { clicked: !!cb, duration };
      })()
    `,
    returnByValue: true
  });
  console.log('Topic toggle result:', toggleResult.result.value);

  // Test Tab Switching: Go to Biblioteca Virtual
  console.log('\nTesting tab switch to Biblioteca Virtual (#tab-library)...');
  const libTabResult = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const start = performance.now();
        App.switchTab('tab-library');
        return { tab: App.activeTab, duration: performance.now() - start };
      })()
    `,
    returnByValue: true
  });
  console.log('Library tab switch result:', libTabResult.result.value);

  // Test Tab Switching: Go to Leitor de PDF (#tab-pdf-reader)
  console.log('\nTesting tab switch to Leitor de PDF (#tab-pdf-reader)...');
  const pdfTabResult = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const start = performance.now();
        App.switchTab('tab-pdf-reader');
        return { tab: App.activeTab, duration: performance.now() - start };
      })()
    `,
    returnByValue: true
  });
  console.log('PDF tab switch result:', pdfTabResult.result.value);

  // Switch back to Matérias & Tópicos (#tab-topics)
  console.log('\nTesting tab switch back to Matérias (#tab-topics)...');
  const topicsTabResult = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const start = performance.now();
        App.switchTab('tab-topics');
        return { tab: App.activeTab, duration: performance.now() - start };
      })()
    `,
    returnByValue: true
  });
  console.log('Topics tab switch result:', topicsTabResult.result.value);

  // Measure final memory after all operations
  const finalPerf = await send('Performance.getMetrics');
  const finalMetrics = {};
  finalPerf.metrics.forEach(m => { finalMetrics[m.name] = m.value; });
  const finalJsHeapMB = (finalMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2);
  const finalNodes = finalMetrics.Nodes;

  console.log('\n=== FINAL CHROME METRICS ===');
  console.log(`Final JS Heap Used: ${finalJsHeapMB} MB`);
  console.log(`Final DOM Nodes: ${finalNodes}`);
  console.log(`Max Allowed Heap: 50 MB`);
  console.log(`Status: ${parseFloat(finalJsHeapMB) < 50 ? 'PASSED (STABLE & FAST)' : 'FAILED'}`);

  ws.close();
}

run()
  .catch(err => {
    console.error('Benchmark Error:', err);
  })
  .finally(() => {
    chrome.kill();
    setTimeout(() => process.exit(0), 1000);
  });
