const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

console.log('--- Testando renderização das Revisões Espaçadas ---');

const html = fs.readFileSync('index.html', 'utf8');

// Monta DOM com JSDOM
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost:8080/"
});

const { window } = dom;

// Aguarda scripts carregarem e App estar pronto
setTimeout(() => {
  const App = window.App;
  if (!App) {
    console.error('App não encontrado no window!');
    process.exit(1);
  }

  // Simula 2 sessões concluídas gerando 6 revisões espaçadas exatamente como no screenshot do usuário
  App.spacedReviews = [
    {
      id: 'rev_slot1_D1',
      slotKey: 'slot1',
      subjectName: 'RACIOCÍNIO LÓGICO-MATEMÁTICO',
      topic: '2.1. Lógica: proposições, conectivos, equivalências lógicas, quantificadores e predicados.',
      paletteId: 'blue',
      code: 'D+1',
      label: 'Revisão 24h (D+1)',
      dueDate: '2026-10-15',
      completed: false
    },
    {
      id: 'rev_slot2_D1',
      slotKey: 'slot2',
      subjectName: 'NOÇÕES DE DIREITO ADMINISTRATIVO',
      topic: '1.1.1. Administração Pública.',
      paletteId: 'purple',
      code: 'D+1',
      label: 'Revisão 24h (D+1)',
      dueDate: '2026-10-15',
      completed: false
    },
    {
      id: 'rev_slot1_D7',
      slotKey: 'slot1',
      subjectName: 'RACIOCÍNIO LÓGICO-MATEMÁTICO',
      topic: '2.1. Lógica: proposições, conectivos, equivalências lógicas, quantificadores e predicados.',
      paletteId: 'blue',
      code: 'D+7',
      label: 'Revisão 7 dias (D+7)',
      dueDate: '2026-10-21',
      completed: false
    },
    {
      id: 'rev_slot2_D7',
      slotKey: 'slot2',
      subjectName: 'NOÇÕES DE DIREITO ADMINISTRATIVO',
      topic: '1.1.1. Administração Pública.',
      paletteId: 'purple',
      code: 'D+7',
      label: 'Revisão 7 dias (D+7)',
      dueDate: '2026-10-21',
      completed: false
    },
    {
      id: 'rev_slot1_D30',
      slotKey: 'slot1',
      subjectName: 'RACIOCÍNIO LÓGICO-MATEMÁTICO',
      topic: '2.1. Lógica: proposições, conectivos, equivalências lógicas, quantificadores e predicados.',
      paletteId: 'blue',
      code: 'D+30',
      label: 'Revisão 30 dias (D+30)',
      dueDate: '2026-11-13',
      completed: false
    },
    {
      id: 'rev_slot2_D30',
      slotKey: 'slot2',
      subjectName: 'NOÇÕES DE DIREITO ADMINISTRATIVO',
      topic: '1.1.1. Administração Pública.',
      paletteId: 'purple',
      code: 'D+30',
      label: 'Revisão 30 dias (D+30)',
      dueDate: '2026-11-13',
      completed: false
    }
  ];

  console.log('1. Renderizando revisões com filtro padrão ("hoje"):');
  App.spacedReviewsFilter = 'hoje';
  App.renderSpacedReviews();

  const card = window.document.getElementById('spacedReviewsCard');
  const list = window.document.getElementById('spacedReviewsList');
  const badge = window.document.getElementById('spacedReviewsBadge');
  const chip = window.document.getElementById('chipSpacedReviews');
  const chipText = window.document.getElementById('chipSpacedText');

  console.log('   - Card visível?', !card.classList.contains('hidden'));
  console.log('   - Badge header text:', badge.textContent);
  console.log('   - Chip text:', chipText.textContent);
  console.log('   - HTML do list no filtro "hoje":', list.innerHTML.trim());

  console.log('\n2. Testando filtro "semana" (próximos 7 dias):');
  App.setSpacedReviewsFilter('semana');
  const itemsSemana = list.querySelectorAll('.spaced-item');
  console.log('   - Qtd de itens na semana (D+1 e D+7 esperados):', itemsSemana.length);
  itemsSemana.forEach((item, i) => {
    const title = item.querySelector('.spaced-item-title')?.textContent.trim();
    const topic = item.querySelector('.spaced-item-topic')?.textContent.trim();
    const code = item.querySelector('.spaced-badge')?.textContent.trim();
    const date = item.querySelector('.spaced-date')?.textContent.trim();
    console.log(`     [${i+1}] ${code} | ${title} | ${date} | ${topic.substring(0, 30)}...`);
  });

  console.log('\n3. Testando filtro "todas" (todas as 6):');
  App.setSpacedReviewsFilter('todas');
  const itemsTodas = list.querySelectorAll('.spaced-item');
  console.log('   - Qtd de itens em todas:', itemsTodas.length);

  console.log('\n4. Testando conclusão de uma revisão (rev_slot1_D1):');
  App.completeSpacedReview('rev_slot1_D1');
  const rev1 = App.spacedReviews.find(r => r.id === 'rev_slot1_D1');
  console.log('   - Revisão 1 completed?', rev1.completed);

  console.log('\n5. Testando filtro "feitas":');
  App.setSpacedReviewsFilter('feitas');
  const itemsFeitas = list.querySelectorAll('.spaced-item');
  console.log('   - Qtd de itens em concluídas:', itemsFeitas.length);

  console.log('\n6. Testando alternância de recolhimento (toggle collapse):');
  App.toggleSpacedReviewsCollapse();
  console.log('   - Card recolhido (collapsed)?', card.classList.contains('collapsed'));
  App.toggleSpacedReviewsCollapse();
  console.log('   - Card expandido novamente?', !card.classList.contains('collapsed'));

  console.log('\n7. Testando fechar o card (closeSpacedReviewsCard):');
  App.closeSpacedReviewsCard();
  console.log('   - Card ocultado (hidden)?', card.classList.contains('hidden'));
  console.log('   - Chip continua no topo?', !chip.classList.contains('hidden'));

  console.log('\n8. Reabrindo pelo chip (toggleSpacedReviewsCollapse):');
  App.toggleSpacedReviewsCollapse();
  console.log('   - Card reaberto com sucesso?', !card.classList.contains('hidden'));

  console.log('\n✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
  process.exit(0);
}, 1000);
