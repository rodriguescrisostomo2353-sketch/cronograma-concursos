/**
 * TESTES UNITÁRIOS DA FERRAMENTA ADMINISTRATIVA (tools/admin/reset-dados.js)
 */

const { parseArgs } = require('./tools/admin/reset-dados');

console.log('========================================================================');
console.log('  TESTES DA FERRAMENTA ADMINISTRATIVA DE RESET (ETAPA 2.2)');
console.log('========================================================================\n');

const results = [];
function check(passed, name, detail = '') {
  results.push({ passed, name });
  const status = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${status} ${name}`);
  if (detail) console.log(`   └─ ${detail}`);
}

// Salva process.argv original
const origArgv = [...process.argv];

// Teste 1: Default args
process.argv = ['node', 'reset-dados.js'];
const opt1 = parseArgs();
check(opt1.mode === 'simulacao', '1. parseArgs padrão: Seleciona modo simulação', `Modo: ${opt1.mode}`);

// Teste 2: Exportar
process.argv = ['node', 'reset-dados.js', '--exportar', './meu_backup.json'];
const opt2 = parseArgs();
check(opt2.mode === 'exportar' && opt2.exportPath === './meu_backup.json', '2. parseArgs exportar: Captura caminho de destino', `Caminho: ${opt2.exportPath}`);

// Teste 3: Executar confirmado sem flag de confirmação
process.argv = ['node', 'reset-dados.js', '--executar-reset-confirmado'];
const opt3 = parseArgs();
check(opt3.mode === 'executar' && opt3.confirm === false, '3. parseArgs segurança: Bloqueia execução sem --confirmar-destruicao-irreversivel', `Confirm: ${opt3.confirm}`);

// Teste 4: Executar confirmado com flag de confirmação
process.argv = ['node', 'reset-dados.js', '--executar-reset-confirmado', '--confirmar-destruicao-irreversivel'];
const opt4 = parseArgs();
check(opt4.mode === 'executar' && opt4.confirm === true, '4. parseArgs execução: Permite quando ambas as flags são fornecidas', `Mode: ${opt4.mode}, Confirm: ${opt4.confirm}`);

// Restaura process.argv
process.argv = origArgv;

console.log('\n========================================================================');
const allPassed = results.every(r => r.passed);
console.log(`  RESULTADO: ${results.filter(r => r.passed).length} de ${results.length} APROVADOS`);
console.log('========================================================================\n');
process.exit(allPassed ? 0 : 1);
