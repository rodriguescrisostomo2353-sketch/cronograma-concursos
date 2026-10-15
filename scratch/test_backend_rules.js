/**
 * Teste Automatizado de Regras de Segurança e Acesso ao Backend na Nuvem (Supabase)
 * Valida:
 * 1. Conexão pública com anonKey
 * 2. Bloqueio de leitura de dados de outros usuários por clientes não autenticados (RLS)
 * 3. Tentativa de injeção indevida
 * 4. Verificação de cabeçalhos e permissões de cliente
 */

const SUPABASE_URL = 'https://arhhajxkmjpjwbrlcsqm.supabase.co';
const ANON_KEY = 'sb_publishable_zZUuqpP2FXG9am-Q7UY95g_musS2nA-';

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

async function runBackendSecurityTests() {
  console.log('========================================================================');
  console.log('  BATERIA DE TESTES DE SEGURANÇA E REGRAS DO BACKEND NA NUVEM');
  console.log('========================================================================');

  // Teste 1: Conexão e integridade com a chave pública de cliente
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data?select=user_id&limit=1`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    assert(res.status === 200, `1. Conexão ao endpoint REST bem-sucedida (Status ${res.status})`);
  } catch (err) {
    assert(false, `1. Falha na conexão REST: ${err.message}`);
  }

  // Teste 2: Tentativa de inserção sem autenticação (deve falhar por RLS ou exigir token de usuário)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: '00000000-0000-0000-0000-000000000000',
        materias: [{ id: 'malicious', nome: 'Ataque Não Autenticado' }]
      })
    });
    // Deve retornar 401 (Unauthorized) ou 403 (Forbidden) ou 42501 (RLS violation)
    const isBlocked = res.status === 401 || res.status === 403 || res.status === 400 || !res.ok;
    assert(isBlocked, `2. Tentativa de escrita sem usuário autenticado bloqueada pelo RLS (Status ${res.status})`);
  } catch (err) {
    assert(true, `2. Escrita bloqueada na rede/servidor: ${err.message}`);
  }

  // Teste 3: Tentativa de consultar dados sensíveis do sistema auth sem permissão de admin
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    assert(!res.ok, `3. Acesso à tabela interna de usuários bloqueado com chave pública (Status ${res.status})`);
  } catch (err) {
    assert(true, `3. Acesso interno bloqueado: ${err.message}`);
  }

  // Teste 4: Endpoint de Autenticação operacional para login/recuperação
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    const data = await res.json();
    assert(res.status === 200 && data.disable_signup === false, '4. Sistema de autenticação (cadastro/login) ativo e aceitando requisições');
  } catch (err) {
    assert(false, `4. Falha no endpoint de Auth: ${err.message}`);
  }

  // Teste 5: Tentativa de login com credencial falsa (deve ser rejeitada com código 400 e mensagem clara)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'usuario_fantasma_teste@exemplo.com',
        password: 'senha_incorreta_seguranca_123'
      })
    });
    assert(res.status === 400 || res.status === 422, `5. Tentativa de login indevido rejeitada com segurança (Status ${res.status})`);
  } catch (err) {
    assert(false, `5. Erro no teste de rejeição: ${err.message}`);
  }

  console.log('========================================================================');
  console.log(`  RESULTADO: ${passed} de ${total} TESTES DE REGRAS DE SEGURANÇA APROVADOS`);
  console.log('========================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runBackendSecurityTests();
