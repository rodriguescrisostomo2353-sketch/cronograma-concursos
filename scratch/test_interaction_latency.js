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

let tInitStart = 0;
let tInitEnd = 0;

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
    
    // Hook into performance profiler
    window.__beforeInit = process.hrtime.bigint();
  }
});

const { window } = dom;

console.log('App materias loaded:', window.App.data.materias.length);
console.log('App studyLog loaded:', window.App.studyLog.length);

// Test 1: Expand materia card 1
const t1 = process.hrtime.bigint();
window.App.toggleSubjectBody('mat_1');
const tExpand = Number(process.hrtime.bigint() - t1) / 1e6;
console.log(`Expand subject card: ${tExpand.toFixed(1)} ms`);

// Test 2: Check topic 1
const t2 = process.hrtime.bigint();
window.StudyHoursManager.toggleTopic('mat_1', 0);
const tCheck = Number(process.hrtime.bigint() - t2) / 1e6;
console.log(`Topic toggle (checkbox click): ${tCheck.toFixed(1)} ms`);

// Test 3: Uncheck topic 1
const t3 = process.hrtime.bigint();
window.StudyHoursManager.toggleTopic('mat_1', 0);
const tUncheck = Number(process.hrtime.bigint() - t3) / 1e6;
console.log(`Topic untoggle (uncheck click): ${tUncheck.toFixed(1)} ms`);

// Test 4: Tab switch to schedule
const t4 = process.hrtime.bigint();
window.App.switchTab('tab-schedule');
const tTabSchedule = Number(process.hrtime.bigint() - t4) / 1e6;
console.log(`Switch tab to Schedule: ${tTabSchedule.toFixed(1)} ms`);

// Test 5: Tab switch to study hours
const t5 = process.hrtime.bigint();
window.App.switchTab('tab-study-hours');
const tTabStudyHours = Number(process.hrtime.bigint() - t5) / 1e6;
console.log(`Switch tab to Study Hours: ${tTabStudyHours.toFixed(1)} ms`);

// Test 6: Tab switch back to subjects
const t6 = process.hrtime.bigint();
window.App.switchTab('tab-subjects');
const tTabSubjects = Number(process.hrtime.bigint() - t6) / 1e6;
console.log(`Switch tab back to Subjects: ${tTabSubjects.toFixed(1)} ms`);
