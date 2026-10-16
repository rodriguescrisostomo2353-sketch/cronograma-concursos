#!/usr/bin/env node
/**
 * ==============================================================================
 * SCRIPT ADMINISTRATIVO DE RESET SEGURO DE DADOS NA NUVEM (ETAPA 2.2)
 * ==============================================================================
 * 
 * Permite a administradores inspecionar, exportar e executar reset geracional
 * de dados na nuvem (Supabase e backend C#) com segurança absoluta.
 * 
 * Modos de Operação:
 *   1. --simulacao: Lê os registros de user_data, exibe contagens e simula o reset sem gravar.
 *   2. --exportar <caminho.json>: Gera backup completo em JSON de todos os usuários antes de qualquer alteração.
 *   3. --executar-reset-confirmado: Executa o reset geracional irreversível.
 *      Exige OBRIGATORIAMENTE:
 *        - Flag explícita: --confirmar-destruicao-irreversivel
 *        - Variável de ambiente: ADMIN_RESET_SECRET ou SUPABASE_SERVICE_ROLE_KEY
 * 
 * Regra de Segurança:
 *   - NUNCA grave chaves secretas ou de serviço neste código ou no git!
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SUPABASE_URL = 'https://arhhajxkmjpjwbrlcsqm.supabase.co';

function printHelp() {
  console.log(`
Uso: node tools/admin/reset-dados.js [opções]

Opções Principais:
  --simulacao                      Executa simulação de reset (modo padrão e seguro).
  --exportar <caminho.json>        Exporta backup completo dos dados da nuvem para arquivo JSON.
  --executar-reset-confirmado      Executa a limpeza real dos dados na nuvem.
  --confirmar-destruicao-irreversivel
                                   Confirmação obrigatória para execução de reset destrutivo.

Opções de Conexão:
  --url <url_supabase>             URL do projeto Supabase (Padrão: ${DEFAULT_SUPABASE_URL})
  --key <service_role_key>         Chave administrativa service_role (Recomendado via env ADMIN_RESET_SECRET)
  --csharp-url <url>               URL base opcional do backend C# (ex: http://localhost:5000)

Exemplos:
  # 1. Simular reset:
  node tools/admin/reset-dados.js --simulacao

  # 2. Exportar backup de segurança pré-reset:
  node tools/admin/reset-dados.js --exportar ./backup_nuvem_pre_reset.json

  # 3. Executar reset real na nuvem (requer variável ADMIN_RESET_SECRET):
  $env:ADMIN_RESET_SECRET="sua-service-role-key"
  node tools/admin/reset-dados.js --executar-reset-confirmado --confirmar-destruicao-irreversivel
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'simulacao',
    exportPath: null,
    confirm: false,
    url: process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    key: process.env.ADMIN_RESET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    csharpUrl: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h' || arg === '--ajuda') {
      printHelp();
      process.exit(0);
    } else if (arg === '--simulacao') {
      options.mode = 'simulacao';
    } else if (arg === '--exportar') {
      options.mode = 'exportar';
      options.exportPath = args[++i];
    } else if (arg === '--executar-reset-confirmado') {
      options.mode = 'executar';
    } else if (arg === '--confirmar-destruicao-irreversivel') {
      options.confirm = true;
    } else if (arg === '--url') {
      options.url = args[++i];
    } else if (arg === '--key') {
      options.key = args[++i];
    } else if (arg === '--csharp-url') {
      options.csharpUrl = args[++i];
    }
  }

  return options;
}

async function fetchAllUserData(url, key) {
  if (!key) {
    throw new Error('Chave de autenticação administrativa necessária. Forneça ADMIN_RESET_SECRET no ambiente ou flag --key.');
  }

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/user_data?select=*`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Falha ao consultar user_data no Supabase (HTTP ${res.status}): ${errText}`);
  }

  return await res.json();
}

async function run() {
  console.log('========================================================================');
  console.log('  FERRAMENTA ADMINISTRATIVA DE RESET SEGURO NA NUVEM');
  console.log('========================================================================\n');

  const options = parseArgs();

  console.log(`[Configuração] URL do Servidor: ${options.url}`);
  console.log(`[Configuração] Modo Selecionado: ${options.mode.toUpperCase()}`);
  console.log(`[Configuração] Chave de Acesso: ${options.key ? '*** (Fornecida)' : 'NÃO FORNECIDA'}\n`);

  if (!options.key) {
    console.error('❌ ERRO DE AUTENTICAÇÃO:');
    console.error('Para executar qualquer operação na base de dados de produção, é necessária a');
    console.error('chave "service_role" (chave administrativa do Supabase).');
    console.error('\nComo obter a chave de serviço:');
    console.error('1. Acesse https://supabase.com/dashboard/project/arhhajxkmjpjwbrlcsqm/settings/api');
    console.error('2. Copie a chave sob a seção "Project API keys" -> "service_role" (secret).');
    console.error('3. Defina a variável de ambiente no seu terminal (NUNCA envie para o git):');
    console.error('   No PowerShell: $env:ADMIN_RESET_SECRET="sua-chave-secreta"');
    console.error('   No Bash: export ADMIN_RESET_SECRET="sua-chave-secreta"\n');
    process.exit(1);
  }

  try {
    console.log('🔍 Consultando registros na tabela "user_data"...');
    const rows = await fetchAllUserData(options.url, options.key);
    console.log(`✅ Sucesso na leitura: ${rows.length} usuário(s) encontrado(s) na nuvem.\n`);

    // MODO 1: EXPORTAR BACKUP
    if (options.mode === 'exportar') {
      const outPath = options.exportPath || path.join(process.cwd(), `backup_nuvem_${Date.now()}.json`);
      const backupData = {
        metadata: {
          app: 'cronograma-concursos',
          exportType: 'admin_full_cloud_backup',
          timestamp: new Date().toISOString(),
          serverUrl: options.url,
          totalUsers: rows.length
        },
        users: rows
      };

      fs.writeFileSync(outPath, JSON.stringify(backupData, null, 2), 'utf8');
      console.log(`🎉 BACKUP COMPLETO GERADO COM SUCESSO!`);
      console.log(`📁 Arquivo salvo em: ${path.resolve(outPath)}`);
      console.log(`📊 Total de usuários arquivados: ${rows.length}\n`);
      return;
    }

    // MODO 2: SIMULAÇÃO
    if (options.mode === 'simulacao') {
      console.log('--- RELATÓRIO DE SIMULAÇÃO DE RESET (NENHUMA ALTERAÇÃO FEITA) ---');
      let totalMaterias = 0;
      let totalTopicos = 0;
      let totalLogs = 0;
      let maxEpoch = 0;

      rows.forEach((r, idx) => {
        const mats = Array.isArray(r.materias) ? r.materias : [];
        const tops = mats.reduce((acc, m) => acc + (Array.isArray(m.topicos) ? m.topicos.length : 0), 0);
        const logs = Array.isArray(r.study_log) ? r.study_log : ((r.auto_config && r.auto_config.study_log) || []);
        const epoch = parseInt(r.reset_epoch !== undefined ? r.reset_epoch : (r.auto_config && r.auto_config.reset_epoch) || 0, 10);
        if (epoch > maxEpoch) maxEpoch = epoch;

        totalMaterias += mats.length;
        totalTopicos += tops;
        totalLogs += (Array.isArray(logs) ? logs.length : 0);

        console.log(`[Usuário ${idx + 1}] ID: ${r.user_id} | Matérias: ${mats.length} | Tópicos: ${tops} | Logs: ${Array.isArray(logs) ? logs.length : 0} | Epoch Atual: ${epoch}`);
      });

      const nextEpoch = Date.now();
      console.log('\n--- RESUMO CONSOLIDADO ---');
      console.log(`Total de Usuários: ${rows.length}`);
      console.log(`Total de Matérias: ${totalMaterias}`);
      console.log(`Total de Tópicos: ${totalTopicos}`);
      console.log(`Total de Registros de Estudo: ${totalLogs}`);
      console.log(`Maior Epoch Atual: ${maxEpoch}`);
      console.log(`Próximo Reset Epoch Calculado: ${nextEpoch}`);
      console.log('\n[SIMULAÇÃO]: A execução real irá zerar as matérias, cronogramas e logs de todos os usuários');
      console.log(`e atualizará o reset_epoch para ${nextEpoch}, ativando o backup local nos dispositivos dos usuários.`);
      console.log('Para prosseguir com a execução real, utilize: --executar-reset-confirmado --confirmar-destruicao-irreversivel\n');
      return;
    }

    // MODO 3: EXECUÇÃO CONFIRMADA
    if (options.mode === 'executar') {
      if (!options.confirm) {
        console.error('⛔ OPERAÇÃO BLOQUEADA POR SEGURANÇA!');
        console.error('A flag --confirmar-destruicao-irreversivel é OBRIGATÓRIA para executar o reset.');
        console.error('O reset apagará todos os dados na nuvem de forma definitiva.\n');
        process.exit(1);
      }

      console.log('🚨 ATENÇÃO: INICIANDO RESET DE DADOS NA NUVEM...');
      const newEpoch = Date.now();

      // Salva backup automático mandatório antes da exclusão
      const autoBackupPath = path.join(process.cwd(), `backup_mandatorio_pre_reset_${newEpoch}.json`);
      fs.writeFileSync(autoBackupPath, JSON.stringify({
        preResetTimestamp: new Date().toISOString(),
        users: rows
      }, null, 2), 'utf8');
      console.log(`🛡️ Backup de segurança mandatório gravado em: ${autoBackupPath}`);

      let sucessos = 0;
      let falhas = 0;

      for (const row of rows) {
        const userId = row.user_id;
        const availableCols = new Set(Object.keys(row));

        const cleanPayload = {
          materias: [],
          nao_classificado: [],
          schedules: [],
          active_schedule_id: null,
          completed_slots: {},
          priorities: {},
          auto_config: {
            ...(row.auto_config && typeof row.auto_config === 'object' ? row.auto_config : {}),
            reset_epoch: newEpoch,
            study_log: []
          },
          spaced_reviews: [],
          updated_at: new Date().toISOString()
        };

        if (availableCols.has('study_log')) {
          cleanPayload.study_log = [];
        }
        if (availableCols.has('reset_epoch')) {
          cleanPayload.reset_epoch = newEpoch;
        }
        if (availableCols.has('device_id')) {
          cleanPayload.device_id = 'admin_reset_cli';
        }
        if (availableCols.has('revision')) {
          cleanPayload.revision = 1;
        }

        const patchUrl = `${options.url.replace(/\/$/, '')}/rest/v1/user_data?user_id=eq.${userId}`;
        const patchRes = await fetch(patchUrl, {
          method: 'PATCH',
          headers: {
            'apikey': options.key,
            'Authorization': `Bearer ${options.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(cleanPayload)
        });

        if (patchRes.ok) {
          sucessos++;
          console.log(`✅ [OK] Usuário ${userId} reiniciado. Nova geração Epoch: ${newEpoch}`);
        } else {
          falhas++;
          const errBody = await patchRes.text();
          console.error(`❌ [FALHA] Usuário ${userId} erro HTTP ${patchRes.status}: ${errBody}`);
        }
      }

      console.log('\n========================================================================');
      console.log(`  RESET CONCLUÍDO: ${sucessos} sucesso(s), ${falhas} falha(s)`);
      console.log(`  NOVA GERAÇÃO ATIVA: Reset Epoch = ${newEpoch}`);
      console.log('========================================================================\n');
    }

  } catch (err) {
    console.error('\n❌ ERRO NA EXECUÇÃO:', err.message);
    process.exit(1);
  }
}

// Exporta para testes automatizados ou executa via CLI
if (require.main === module) {
  run();
}

module.exports = {
  parseArgs,
  fetchAllUserData,
  DEFAULT_SUPABASE_URL
};
