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

// Expand materia 1
window.App.toggleSubjectBody('mat_1');

// Measure UNOPTIMIZED topic toggle
const tUnopt0 = process.hrtime.bigint();
for (let i = 0; i < 10; i++) {
  window.StudyHoursManager.toggleTopic('mat_1', i % 5);
}
const tUnoptTotal = Number(process.hrtime.bigint() - tUnopt0) / 1e6;
console.log(`10 Topic Toggles (BEFORE optimization): ${tUnoptTotal.toFixed(1)} ms (${(tUnoptTotal/10).toFixed(1)} ms/toggle)`);

// Apply optimizations in memory to test effect:
// 1. StudyHoursManager.renderTab guard
const origRenderTab = window.StudyHoursManager.renderTab;
window.StudyHoursManager.renderTab = function(force = false) {
  if (!force && window.App.activeTab !== 'tab-study-hours') {
    this._dirty = true;
    return;
  }
  return origRenderTab.call(this);
};

// 2. Targeted topic DOM update instead of App.renderSubjects()
window.App.updateTopicDom = function(materiaId, topicIndex, isDone) {
  const body = window.document.getElementById(`body-${materiaId}`);
  if (!body) return;
  const topicItems = body.querySelectorAll('.topic-item');
  if (topicItems && topicItems[topicIndex]) {
    const item = topicItems[topicIndex];
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = isDone;
    if (isDone) item.classList.add('done');
    else item.classList.remove('done');
  }
  window.App.updateHoursBadge();
};

const origToggleTopic = window.StudyHoursManager.toggleTopic;
window.StudyHoursManager.toggleTopic = function(materiaId, topicIndex) {
  const materia = (window.App.data.materias || []).find(m => window.idMateria(m) === materiaId);
  if (!materia || !materia.topicos || !materia.topicos[topicIndex]) return;
  const topic = materia.topicos[topicIndex];
  const isDone = !!topic.concluido;
  
  if (isDone) {
    topic.concluido = false;
  } else {
    topic.concluido = true;
  }
  window.App.updateTopicDom(materiaId, topicIndex, topic.concluido);
};

// Measure OPTIMIZED topic toggle
const tOpt0 = process.hrtime.bigint();
for (let i = 0; i < 10; i++) {
  window.StudyHoursManager.toggleTopic('mat_1', i % 5);
}
const tOptTotal = Number(process.hrtime.bigint() - tOpt0) / 1e6;
console.log(`10 Topic Toggles (AFTER optimization): ${tOptTotal.toFixed(1)} ms (${(tOptTotal/10).toFixed(1)} ms/toggle)`);
console.log(`Speedup factor: ${(tUnoptTotal / tOptTotal).toFixed(1)}x faster!`);
