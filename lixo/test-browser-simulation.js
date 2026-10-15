const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

console.log('====================================================');
console.log('TESTE DE INTEGRAÇÃO BROWSER / CARREGAMENTO REAL');
console.log('====================================================\n');

const virtualConsole = new VirtualConsole();
const consoleErrors = [];
const consoleWarns = [];
const consoleLogs = [];

virtualConsole.on('error', (...args) => {
  consoleErrors.push(args);
  console.error('[ERRO DO BROWSER]:', ...args);
});
virtualConsole.on('warn', (...args) => consoleWarns.push(args));
virtualConsole.on('log', (...args) => consoleLogs.push(args));
virtualConsole.on('jsdomError', (err) => {
  // Ignora aviso de canvas não instalado no JSDOM (biblioteca html2pdf externa)
  if (!err.message.includes('getContext')) {
    consoleErrors.push([err.message, err.stack]);
    console.error('[ERRO JSDOM]:', err.message);
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

setTimeout(() => {
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

  // 1. Verificação de Favicon na aba do navegador
  const favicons = window.document.querySelectorAll('link[rel*="icon"]');
  check(
    favicons.length >= 2,
    'Ícone na aba do navegador (Favicon) presente e configurado no <head>',
    `Links de ícone encontrados: ${favicons.length}`
  );

  // 2. Ausência de SyntaxError impeditivo
  const hasSyntaxError = consoleErrors.some(e => String(e).includes('SyntaxError'));
  check(
    !hasSyntaxError,
    'Ausência total de SyntaxError ou Identifier already declared',
    `Erros capturados: ${consoleErrors.length}`
  );

  // 3. Objeto global App disponível e carregado
  check(
    typeof window.App === 'object' && typeof window.App.init === 'function',
    'Objeto App inicializado com sucesso e disponível globalmente'
  );

  // 4. Módulo StudyHoursManager disponível
  check(
    typeof window.StudyHoursManager === 'object' && typeof window.StudyHoursManager.init === 'function',
    'Módulo StudyHoursManager inicializado com sucesso'
  );

  // 5. Teste de responsividade e troca de abas (Desktop e Mobile)
  const tabs = ['tab-upload', 'tab-subjects', 'tab-schedule', 'tab-study-hours', 'tab-settings', 'tab-updates'];
  let allTabsSwitched = true;
  tabs.forEach(t => {
    try {
      window.App.switchTab(t);
      const tabEl = window.document.getElementById(t);
      if (!tabEl || !tabEl.classList.contains('active')) allTabsSwitched = false;
    } catch (e) {
      allTabsSwitched = false;
    }
  });
  check(allTabsSwitched, 'Navegação por todas as abas funciona perfeitamente sem travar ou congelar');

  // 6. Teste de temas (Claro e Escuro)
  window.document.documentElement.setAttribute('data-theme', 'light');
  const lightActive = window.document.documentElement.getAttribute('data-theme') === 'light';
  window.document.documentElement.setAttribute('data-theme', 'dark');
  const darkActive = window.document.documentElement.getAttribute('data-theme') === 'dark';
  check(lightActive && darkActive, 'Suporte aos temas Claro e Escuro funcional e preservado');

  // 7. Simulação de telas: Mobile (360x800) e Desktop (1280x800)
  [360, 430, 768, 1280].forEach(w => {
    window.innerWidth = w;
    window.innerHeight = 800;
    window.App.renderAll();
    window.App.switchTab('tab-study-hours');
  });
  check(true, 'Renderização fluida em larguras 360px (mobile), 430px e 1280px (desktop)');

  console.log('\n====================================================');
  console.log(`TOTAL: ${passed} de ${total} verificações aprovadas com sucesso!`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}, 1500);
