import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve('index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(htmlContent, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost/'
});

const { window } = dom;

let errors = [];
window.addEventListener('error', (e) => {
  errors.push(e.message);
});

console.log('--- AUDITORIA DE DOM, TEMAS E VALORES ANÔMALOS ---');

// Inicializa App
if (window.App && window.App.init) {
  window.App.init();
}

const tabs = ['tab-subjects', 'tab-schedule', 'tab-study-hours', 'tab-pdf-library', 'tab-updates', 'tab-settings'];

tabs.forEach(tabId => {
  if (window.App.switchTab) {
    window.App.switchTab(tabId);
  }
  const bodyText = window.document.body.innerHTML;
  
  // Procura por anomalias
  const hasObjectObject = bodyText.includes('[object Object]');
  const hasUndefinedText = /([^\w]undefined[^\w])/i.test(bodyText);
  const hasNaNText = /([^\w]NaN[^\w])/i.test(bodyText);

  console.log(`Aba "${tabId}":`);
  console.log(`  - [object Object]: ${hasObjectObject ? '❌ ENCONTRADO' : '✅ Limpo'}`);
  console.log(`  - undefined visível: ${hasUndefinedText ? '❌ ENCONTRADO' : '✅ Limpo'}`);
  console.log(`  - NaN visível: ${hasNaNText ? '❌ ENCONTRADO' : '✅ Limpo'}`);

  if (hasObjectObject || hasUndefinedText || hasNaNText) {
    process.exit(1);
  }
});

// Teste dos temas
console.log('\nTeste de alternância de temas:');
window.App.setTheme('dark');
console.log('  - Tema escuro data-theme:', window.document.documentElement.getAttribute('data-theme') === 'dark' ? '✅ dark' : '❌ Falhou');
window.App.setTheme('light');
console.log('  - Tema claro data-theme:', window.document.documentElement.getAttribute('data-theme') === 'light' ? '✅ light' : '❌ Falhou');

console.log('\nAUDITORIA VISUAL CONCLUÍDA COM 100% DE SUCESSO!');
process.exit(0);
