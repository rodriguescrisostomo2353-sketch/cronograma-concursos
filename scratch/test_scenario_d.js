const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function generateHeavyDataset() {
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

const heavyData = generateHeavyDataset();

const virtualConsole = new VirtualConsole();
virtualConsole.on('error', () => {});
virtualConsole.on('warn', () => {});

const dom = new JSDOM(html, {
  url: 'http://localhost:8080/',
  runScripts: 'dangerously',
  resources: 'usable',
  virtualConsole,
  pretendToBeVisual: true,
  beforeParse(window) {
    window.localStorage.setItem('concurso_app_data', JSON.stringify({ materias: heavyData.materias, naoClassificado: [] }));
    window.localStorage.setItem('concurso_study_log', JSON.stringify(heavyData.studyLog));
    window.localStorage.setItem('concurso_completed_slots', JSON.stringify(heavyData.completedSlots));
  }
});

const { window } = dom;

// Test renderAll with all tabs eagerly vs lazy
const tEager0 = process.hrtime.bigint();
window.App.renderAll();
window.App.renderSchedule();
window.App.renderSpacedReviews();
window.App.renderScheduleProgress();
window.App.renderDiagnosticsLog();
const tEager = Number(process.hrtime.bigint() - tEager0) / 1e6;
console.log(`Eager all-tab render: ${tEager.toFixed(1)} ms (x4 cpu slowdown = ${(tEager * 4).toFixed(1)} ms)`);

const tLazy0 = process.hrtime.bigint();
window.App.renderSubjectList();
window.App.updateHeaderCounters();
const tLazy = Number(process.hrtime.bigint() - tLazy0) / 1e6;
console.log(`Lazy active-tab-only render: ${tLazy.toFixed(1)} ms (x4 cpu slowdown = ${(tLazy * 4).toFixed(1)} ms)`);
console.log(`Render time reduced by: ${(100 - (tLazy / tEager) * 100).toFixed(1)}%`);
