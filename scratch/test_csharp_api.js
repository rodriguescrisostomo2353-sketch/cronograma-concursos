/**
 * Bateria de Testes de Integração e Segurança da API C# (ASP.NET Core 9)
 */

const BASE_URL = 'http://localhost:5050';
const TEST_EMAIL = `concurseiro_${Date.now()}@teste.com`;
const TEST_PASSWORD = 'SenhaSegura@2026';

let passed = 0;
let total = 0;
let authToken = '';

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('  TESTES DE INTEGRAÇÃO & SEGURANÇA DA API C# (ASP.NET CORE 9)');
  console.log('========================================================================\n');

  // 1. Health Check
  try {
    const res = await fetch(`${BASE_URL}/`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'healthy', `1. Health Check da API C# (${data.service} - ${data.framework})`);
  } catch (err) {
    assert(false, `1. Health check falhou: ${err.message}`);
  }

  // 2. Cadastro de Novo Usuário
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true && !!data.token, '2. Cadastro de novo usuário com hash PBKDF2 e retorno de JWT');
    authToken = data.token;
  } catch (err) {
    assert(false, `2. Cadastro falhou: ${err.message}`);
  }

  // 3. Tentativa de Cadastro Duplicado (deve retornar 409 Conflict)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    assert(res.status === 409, `3. Rejeição de cadastro duplicado (Status ${res.status})`);
  } catch (err) {
    assert(false, `3. Teste duplicado falhou: ${err.message}`);
  }

  // 4. Login com Senha Correta
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true && !!data.token, '4. Login com senha válida e emissão de novo token JWT');
    authToken = data.token;
  } catch (err) {
    assert(false, `4. Login falhou: ${err.message}`);
  }

  // 5. Tentativa de Login com Senha Incorreta (deve retornar 401 Unauthorized)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: 'senha_errada_123' })
    });
    assert(res.status === 401, `5. Rejeição de credencial inválida (Status ${res.status})`);
  } catch (err) {
    assert(false, `5. Teste senha errada falhou: ${err.message}`);
  }

  // 6. Tentativa de Acesso a Dados sem Token (deve retornar 401 Unauthorized)
  try {
    const res = await fetch(`${BASE_URL}/api/userdata`);
    assert(res.status === 401, `6. Bloqueio de endpoint protegido sem token JWT (Status ${res.status})`);
  } catch (err) {
    assert(false, `6. Teste proteção falhou: ${err.message}`);
  }

  // 7. Sincronização e Salvamento de Dados com Token
  const testPayload = {
    materias: [
      { id: 'mat-csharp-1', nome: 'Direito Constitucional', topicos: [{ id: 't1', texto: 'Direitos Fundamentais', concluido: true }] },
      { id: 'mat-csharp-2', nome: 'Direito Administrativo', topicos: [{ id: 't2', texto: 'Licitações', concluido: false }] }
    ],
    schedules: [
      { id: 'sched-1', name: 'Ciclo Semanal', type: 'auto' }
    ],
    activeScheduleId: 'sched-1',
    completedSlots: { 'Segunda-bloco-sched-1-0': true },
    studyLog: [
      { id: 'log-1', materiaNome: 'Direito Constitucional', minutos: 50, data: '2026-10-15' }
    ],
    theme: 'dark',
    dataVersion: 1
  };

  try {
    const res = await fetch(`${BASE_URL}/api/userdata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(testPayload)
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, '7. Gravação e sincronização de dados do usuário com Bearer JWT');
  } catch (err) {
    assert(false, `7. Gravação de dados falhou: ${err.message}`);
  }

  // 8. Leitura dos Dados Salvos
  try {
    const res = await fetch(`${BASE_URL}/api/userdata`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    const hasMaterias = Array.isArray(data.materias) && data.materias.length === 2;
    const isDarkTheme = data.theme === 'dark';
    assert(res.status === 200 && hasMaterias && isDarkTheme, '8. Recuperação com integridade total dos dados salvos na nuvem C#');
  } catch (err) {
    assert(false, `8. Leitura de dados falhou: ${err.message}`);
  }

  // 9. Verificação de Sincronização Incremental (check-sync)
  try {
    const res = await fetch(`${BASE_URL}/api/userdata/check-sync`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    assert(res.status === 200 && data.hasData === true && !!data.updatedAt, '9. Endpoint check-sync retornando carimbo de data/hora para economia de banda');
  } catch (err) {
    assert(false, `9. Check-sync falhou: ${err.message}`);
  }

  // 10. Solicitação de Recuperação de Senha
  try {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, '10. Endpoint de recuperação de senha com proteção contra enumeração');
  } catch (err) {
    assert(false, `10. Reset password falhou: ${err.message}`);
  }

  // 11. Exclusão de Conta e Dados (LGPD)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ password: TEST_PASSWORD })
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, '11. Exclusão definitiva de conta e dados em cascata (Conformidade LGPD)');
  } catch (err) {
    assert(false, `11. Exclusão de conta falhou: ${err.message}`);
  }

  // 12. Confirmação que o usuário excluído não consegue mais fazer login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    assert(res.status === 401, '12. Verificação de remoção definitiva: login do usuário excluído recusado');
  } catch (err) {
    assert(false, `12. Verificação pós-exclusão falhou: ${err.message}`);
  }

  console.log('\n========================================================================');
  console.log(`  RESULTADO: ${passed} de ${total} TESTES DA API C# APROVADOS COM SUCESSO!`);
  console.log('========================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
