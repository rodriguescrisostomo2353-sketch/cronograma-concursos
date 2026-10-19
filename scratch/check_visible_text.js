import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;

if (window.App && window.App.init) {
  window.App.init();
}

const tabs = ['tab-subjects', 'tab-schedule', 'tab-study-hours', 'tab-pdf-library', 'tab-updates', 'tab-settings'];

let anyError = false;

tabs.forEach(tabId => {
  if (window.App.switchTab) {
    window.App.switchTab(tabId);
  }
  
  // Clona e remove script e style para auditar APENAS texto visível ao usuário
  const clone = window.document.body.cloneNode(true);
  clone.querySelectorAll('script, style').forEach(el => el.remove());

  const visibleText = clone.textContent || '';

  const hasObj = visibleText.includes('[object Object]');
  const hasUndef = /\bundefined\b/.test(visibleText);
  const hasNan = /\bNaN\b/.test(visibleText);

  console.log(`Aba [${tabId}]:`);
  console.log(`  - '[object Object]' visível: ${hasObj ? '❌ SIM' : '✅ NÃO'}`);
  console.log(`  - 'undefined' visível: ${hasUndef ? '❌ SIM' : '✅ NÃO'}`);
  console.log(`  - 'NaN' visível: ${hasNan ? '❌ SIM' : '✅ NÃO'}`);

  if (hasObj || hasUndef || hasNan) {
    anyError = true;
    // Encontra o elemento específico
    clone.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && el.textContent) {
        if (el.textContent.includes('[object Object]') || /\bundefined\b/.test(el.textContent) || /\bNaN\b/.test(el.textContent)) {
          console.log(`    -> Elemento anômalo: <${el.tagName} id="${el.id}" class="${el.className}">: "${el.textContent.trim()}"`);
        }
      }
    });
  }
});

if (anyError) {
  process.exit(1);
} else {
  console.log('\n🎉 PARABÉNS: ZERO TEXTOS ANÔMALOS ([object Object], undefined, NaN) NA INTERFACE!');
  process.exit(0);
}
