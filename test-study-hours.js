/**
 * =========================================================================
 * SUÍTE DE TESTES AUTOMATIZADOS: ABA "HORAS DE ESTUDO" (v1.7.0)
 * =========================================================================
 * Executa testes reais in-DOM com JSDOM simulando o navegador.
 */
const fs = require('fs');
const { JSDOM } = require('jsdom');

console.log('====================================================');
console.log('INICIANDO SUÍTE DE TESTES: ABA HORAS DE ESTUDO');
console.log('====================================================\n');

// 1. Carrega o HTML do projeto
const htmlSource = fs.readFileSync('index.html', 'utf8');

// Cria instância JSDOM com URL local para habilitar localStorage sem opaque origins
const dom = new JSDOM(htmlSource, {
  url: 'https://app.local/',
  pretendToBeVisual: true
});

const { window } = dom;

// Polyfills para simular métodos do navegador não emulados por padrão no JSDOM
window.scrollTo = () => {};
window.alert = () => {};
window.confirm = () => true;
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };
};

// Extrai e executa o script da aplicação
const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let m, appScriptCode = '';
while ((m = scriptRegex.exec(htmlSource)) !== null) {
  if (m[1].length > 1000) appScriptCode = m[1];
}

const fnApp = new Function('window', 'document', 'localStorage', 'navigator', appScriptCode);
fnApp(window, window.document, window.localStorage, window.navigator);

const { document, localStorage, StudyHoursManager, App } = window;

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName, details = '') {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✅ [PASS] ${testName}`);
    if (details) console.log(`   └─ Detalhe: ${details}`);
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   └─ Erro: ${details}`);
  }
}

async function runTests() {
  try {
    // Inicialização da aplicação
    App.init();

    // Setup de matérias e tópicos para os testes
    App.data = {
      materias: [
        {
          id: 'mat_dir_const',
          nome: 'Direito Constitucional',
          paletteId: 'blue',
          topicos: [
            { id: 'top_const_1', texto: '1. Direitos e Garantias Fundamentais', concluido: false },
            { id: 'top_const_2', texto: '2. Organização do Estado', concluido: false },
            { id: 'top_const_3', texto: '3. Poder Judiciário', concluido: false }
          ]
        },
        {
          id: 'mat_portugues',
          nome: 'Língua Portuguesa',
          paletteId: 'emerald',
          topicos: [
            { id: 'top_port_1', texto: '1. Interpretação de Texto', concluido: false },
            { id: 'top_port_2', texto: '2. Sintaxe da Oração e do Período', concluido: false }
          ]
        }
      ],
      naoClassificado: []
    };
    App.studyLog = [];
    App.completedSlots = {};
    App.saveToStorage();

    console.log('\n--- TESTE 1: RATEIO DINÂMICO DE SESSÃO DO CRONOGRAMA (50 MIN, 2 TÓPICOS) ---');
    /**
     * Regra Escolhida e Explicada:
     * Sessão de 50 min com 2 tópicos -> 25 min para cada tópico (50 / 2).
     * Ao desmarcar 1 tópico da sessão -> o outro tópico volta a 50 min (50 / 1),
     * pois a sessão de 50 min do cronograma teve seu tempo concentrado no tópico que continuou estudado.
     * Caso ambos sejam desmarcados, os registros daquela sessão são zerados e a sessão é desmarcada.
     */
    const slotSessao = {
      slotKey: 'slot_seg_1',
      subjectId: 'mat_dir_const',
      subjectName: 'Direito Constitucional',
      topic: '1. Direitos e Garantias Fundamentais, 2. Organização do Estado',
      duration: 50,
      date: '2026-10-14'
    };

    // Marca a sessão como concluída
    StudyHoursManager.handleSessionCompleted(slotSessao, true);

    const logT1 = StudyHoursManager.getStudyLog().find(l => l.topicoId === 'top_const_1' && l.sessaoId === 'slot_seg_1');
    const logT2 = StudyHoursManager.getStudyLog().find(l => l.topicoId === 'top_const_2' && l.sessaoId === 'slot_seg_1');

    assert(
      logT1 && logT1.minutos === 25 && logT2 && logT2.minutos === 25,
      'Rateio inicial de 50 min entre 2 tópicos: 25 min para cada',
      `Tópico 1: ${logT1 ? logT1.minutos : 0} min | Tópico 2: ${logT2 ? logT2.minutos : 0} min (Total: 50 min)`
    );

    // Agora desmarca o Tópico 1 da matéria
    StudyHoursManager.toggleTopic('mat_dir_const', 0); // index 0 é top_const_1 que estava concluído

    const logT1AposUncheck = StudyHoursManager.getStudyLog().find(l => l.topicoId === 'top_const_1');
    const logT2AposUncheck = StudyHoursManager.getStudyLog().find(l => l.topicoId === 'top_const_2' && l.sessaoId === 'slot_seg_1');

    assert(
      !logT1AposUncheck && logT2AposUncheck && logT2AposUncheck.minutos === 50,
      'Ao desmarcar Tópico 1, Tópico 2 restante absorve a totalidade dos 50 min da sessão',
      `Tópico 1 removido: ${!logT1AposUncheck} | Tópico 2 recalculado para: ${logT2AposUncheck ? logT2AposUncheck.minutos : 0} min`
    );

    // Desmarca o Tópico 2
    StudyHoursManager.toggleTopic('mat_dir_const', 1); // index 1 é top_const_2
    const totalSessaoRestante = StudyHoursManager.getStudyLog().filter(l => l.sessaoId === 'slot_seg_1').length;
    assert(
      totalSessaoRestante === 0,
      'Ao desmarcar todos os tópicos da sessão, os registros são removidos integralmente',
      `Registros restantes da sessão: ${totalSessaoRestante}`
    );


    console.log('\n--- TESTE 2: IDEMPOTÊNCIA: MARCAR, DESMARCAR E MARCAR DE NOVO ---');
    App.studyLog = [];
    StudyHoursManager.autoQuickMark = true; // 1 toque = 30 min padrão
    StudyHoursManager.defaultMinutes = 30;

    // 1. Marca tópico 3 de Direito Constitucional
    StudyHoursManager.toggleTopic('mat_dir_const', 2);
    const totalAposMarcar1 = StudyHoursManager.getTotalStudyMinutes();
    assert(totalAposMarcar1 === 30, 'Marca tópico avulso: total passa a 30 min', `Total: ${totalAposMarcar1} min`);

    // 2. Desmarca tópico 3
    StudyHoursManager.toggleTopic('mat_dir_const', 2);
    const totalAposDesmarcar = StudyHoursManager.getTotalStudyMinutes();
    assert(totalAposDesmarcar === 0, 'Desmarca tópico avulso: total volta a 0 min (não fica negativo)', `Total: ${totalAposDesmarcar} min`);

    // 3. Marca de novo
    StudyHoursManager.toggleTopic('mat_dir_const', 2);
    const totalAposMarcar2 = StudyHoursManager.getTotalStudyMinutes();
    const countLogs = StudyHoursManager.getStudyLog().length;
    assert(
      totalAposMarcar2 === 30 && countLogs === 1,
      'Marca de novo: total é exatamente 30 min sem duplicar entradas',
      `Total: ${totalAposMarcar2} min | Quantidade de logs: ${countLogs}`
    );


    console.log('\n--- TESTE 3: FILTROS DE FRONTEIRA E HORÁRIO ESTRITAMENTE LOCAL ---');
    /**
     * Teste de fronteira com domingo à noite, virada de mês e de ano
     */
    // Domingo 18 de Outubro de 2026 às 23:30 (horário de Brasília)
    const dataDomingoNoite = new Date(2026, 9, 18, 23, 30, 0); // Outubro = mês 9 (0-indexed)
    const strDomingo = StudyHoursManager.getLocalDateString(dataDomingoNoite);
    assert(
      strDomingo === '2026-10-18',
      'Data de domingo às 23:30 permanece no domingo 2026-10-18 (não vira segunda-feira via UTC)',
      `Data local gerada: "${strDomingo}"`
    );

    // Filtro da semana correspondente ao domingo 18/10/2026
    const rangeSemana = StudyHoursManager.getWeekRange(dataDomingoNoite);
    assert(
      rangeSemana.startStr === '2026-10-12' && rangeSemana.endStr === '2026-10-18',
      'Semana (segunda a domingo) engloba corretamente de 12/10 a 18/10',
      `Início: ${rangeSemana.startStr} | Fim: ${rangeSemana.endStr}`
    );

    // Último dia do mês (31 de Outubro às 23:59)
    const dataUltimoDiaMes = new Date(2026, 9, 31, 23, 59, 59);
    const strUltimoDia = StudyHoursManager.getLocalDateString(dataUltimoDiaMes);
    const rangeMesOut = StudyHoursManager.getMonthRange(2026, 9);
    assert(
      strUltimoDia === '2026-10-31' && strUltimoDia <= rangeMesOut.endStr,
      'Último dia do mês (31/10 23:59) pertence a Outubro',
      `Data: ${strUltimoDia} | Fim de Outubro: ${rangeMesOut.endStr}`
    );

    // Virada de Ano: 31/12/2026 23:59 vs 01/01/2027 00:05
    const reveillon2026 = new Date(2026, 11, 31, 23, 59, 0);
    const anoNovo2027 = new Date(2027, 0, 1, 0, 5, 0);
    const strReveillon = StudyHoursManager.getLocalDateString(reveillon2026);
    const strAnoNovo = StudyHoursManager.getLocalDateString(anoNovo2027);
    assert(
      strReveillon === '2026-12-31' && strAnoNovo === '2027-01-01',
      'Virada de ano separa corretamente 2026-12-31 e 2027-01-01',
      `Reveillon: ${strReveillon} | Ano Novo: ${strAnoNovo}`
    );


    console.log('\n--- TESTE 4: IDENTIDADE DE TOTAIS (DISCIPLINA = SOMA TÓPICOS, TOTAL = SOMA DISCIPLINAS) ---');
    App.studyLog = [];
    // Adiciona entradas controladas
    // Direito Constitucional: Tópico 1 (45 min), Tópico 2 (30 min) -> Matéria = 75 min (1h 15min)
    // Língua Portuguesa: Tópico 1 (60 min), Tópico 2 (15 min) -> Matéria = 75 min (1h 15min)
    // Total Geral esperado = 150 min (2h 30min)
    StudyHoursManager.addLogEntry({ topicoId: 'top_const_1', materiaId: 'mat_dir_const', minutos: 45, data: '2026-10-14' });
    StudyHoursManager.addLogEntry({ topicoId: 'top_const_2', materiaId: 'mat_dir_const', minutos: 30, data: '2026-10-14' });
    StudyHoursManager.addLogEntry({ topicoId: 'top_port_1', materiaId: 'mat_portugues', minutos: 60, data: '2026-10-14' });
    StudyHoursManager.addLogEntry({ topicoId: 'top_port_2', materiaId: 'mat_portugues', minutos: 15, data: '2026-10-14' });

    const totalConst = StudyHoursManager.getTotalMinutesForSubject('mat_dir_const');
    const totalConstTopicos = StudyHoursManager.getTotalMinutesForTopic('mat_dir_const', 'top_const_1') + 
                              StudyHoursManager.getTotalMinutesForTopic('mat_dir_const', 'top_const_2');
    const totalPort = StudyHoursManager.getTotalMinutesForSubject('mat_portugues');
    const totalPortTopicos = StudyHoursManager.getTotalMinutesForTopic('mat_portugues', 'top_port_1') + 
                             StudyHoursManager.getTotalMinutesForTopic('mat_portugues', 'top_port_2');
    const totalGeral = StudyHoursManager.getTotalStudyMinutes();

    assert(
      totalConst === 75 && totalConst === totalConstTopicos,
      'Total de Direito Constitucional igual à soma dos seus tópicos (75 min)',
      `Total Matéria: ${totalConst} min = Tópicos: ${totalConstTopicos} min`
    );
    assert(
      totalPort === 75 && totalPort === totalPortTopicos,
      'Total de Língua Portuguesa igual à soma dos seus tópicos (75 min)',
      `Total Matéria: ${totalPort} min = Tópicos: ${totalPortTopicos} min`
    );
    assert(
      totalGeral === (totalConst + totalPort) && totalGeral === 150,
      'Total Geral igual à soma das matérias (150 min = 2h 30min)',
      `Total Geral: ${StudyHoursManager.formatMinutes(totalGeral)} (${totalGeral} min)`
    );


    console.log('\n--- TESTE 5: RENDERIZAÇÃO DA ABA COM/SEM REGISTROS NOS DOIS TEMAS (360-430PX) ---');
    const screenWidths = [360, 390, 412, 430];
    const themes = ['light', 'dark'];

    // 5.1 Teste com registros
    for (const theme of themes) {
      document.documentElement.setAttribute('data-theme', theme);
      for (const width of screenWidths) {
        window.innerWidth = width;
        App.switchTab('tab-study-hours');
        StudyHoursManager.renderTab();
        assert(
          document.getElementById('tab-study-hours').classList.contains('active'),
          `Renderização com registros [Tema: ${theme}, Largura: ${width}px]`,
          `Gráfico SVG presente: ${!!document.querySelector('#studyChartContainer svg')}`
        );
      }
    }

    // 5.2 Teste sem registros (Estado Vazio)
    App.studyLog = [];
    StudyHoursManager.renderTab();
    const emptyStateEl = document.getElementById('studyEmptyState');
    assert(
      emptyStateEl && emptyStateEl.style.display !== 'none',
      'Estado vazio exibido com mensagem amigável quando não há registros no período',
      'Nenhum estudo registrado neste período visível'
    );


    console.log('\n--- TESTE 6: AUSÊNCIA DE "[object Object]", "undefined" OU "NaN" NA INTERFACE ---');
    App.renderAll();
    App.switchTab('tab-study-hours');
    StudyHoursManager.renderTab();

    const cloneBody = document.body.cloneNode(true);
    cloneBody.querySelectorAll('script').forEach(s => s.remove());
    const appBodyHtml = cloneBody.innerHTML;
    const hasObjectObject = appBodyHtml.includes('[object Object]');
    const hasNaN = />\s*NaN[<\s]/.test(appBodyHtml) || appBodyHtml.includes('NaN min') || appBodyHtml.includes('NaNh');
    const hasUndefined = />\s*undefined[<\s]/.test(appBodyHtml) || appBodyHtml.includes('undefined min');

    assert(!hasObjectObject, 'Nenhum "[object Object]" detectado no HTML da aplicação');
    assert(!hasNaN, 'Nenhum "NaN" detectado nos valores ou métricas exibidas');
    assert(!hasUndefined, 'Nenhum "undefined" exibido em rótulos ou listas');

    console.log('\n====================================================');
    console.log(`RESULTADO FINAL: ${passedCount} de ${totalCount} testes passaram com sucesso!`);
    console.log('====================================================');

    if (passedCount === totalCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('ERRO FATAL NA EXECUÇÃO DOS TESTES:', err);
    process.exit(1);
  }
}

runTests();
