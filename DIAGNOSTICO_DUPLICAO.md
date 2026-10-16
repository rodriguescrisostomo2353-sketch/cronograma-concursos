# Relatório de Diagnóstico da Causa de Duplicações na Sincronização

**Data do Diagnóstico:** 16 de Outubro de 2026  
**Branch de Trabalho:** `sync-sem-duplicados`  
**Escopo:** Frontend Web (HTML/JS/TS), Capacitor Android e Backend C# ASP.NET Core 9

---

## 1. Resumo Executivo em Linguagem Simples

Após varredura completa no mecanismo de armazenamento local, divisão de edital, fila de sincronização e comunicação com a nuvem, identificamos **8 causas estruturais** que provocavam a multiplicação de matérias, tópicos, horas e anotações:

1. **Geração de IDs temporários a cada leitura ou divisão:** Em vez de manter um ID fixo e eterno, o sistema gerava `Date.now() + Math.random()` para matérias e tópicos. Reprocessar o mesmo edital criava IDs novos para os mesmos assuntos.
2. **Tópicos sem identificador determinístico no divisor numérico:** A função de dividir edital gerava apenas números e textos sem ID. Ao serem salvos, ganhavam IDs voláteis diferentes.
3. **Concatenação cega no merge:** As listas de `nao_classificado`, `pdf_annotations` e `pdf_bookmarks` eram unidas com `[...local, ...cloud]`, dobrando de tamanho a cada sincronização.
4. **Fila de envio (Outbox) sem compactação nem ID de operação (`opId`):** Alterações repetidas acumulavam eventos e, se a conexão oscilasse, a fila era reenviada gerando múltiplos registros de estudo.
5. **Reação ao eco das próprias gravações (falta de `deviceId` e hash de conteúdo):** O app não identificava que a alteração vinda da nuvem tinha sido gerada por ele mesmo, reprocessando os dados em ciclo.
6. **Ouvintes de rede e autenticação acumulados:** Eventos `online`/`offline` e `onAuthStateChange` registrados sem limpeza prévia disparavam múltiplos fluxos concorrentes.
7. **Falta de isolamento de cache local por usuário:** Ao trocar de conta no mesmo aparelho, os dados do usuário anterior permaneciam no `localStorage` e eram mesclados na conta do novo usuário.
8. **Ausência de Disjuntor de Segurança:** Não existia limite de crescimento súbito ou volumetria, permitindo que anomalias se propagassem para o banco.

---

## 2. Mapa Detalhado das Causas: Arquivo, Linha e Mecanismo

| # | Arquivo | Linhas | Mecanismo do Erro | Impacto |
|---|---|---|---|---|
| 1 | `index.html` | L15096-L15102 | `id: 'mat-' + Date.now() + '-' + Math.floor(Math.random() * 10000)` em `parseEditalText` | Cada vez que o usuário reprocessa o edital ou edita o texto, matérias idênticas ganham IDs diferentes. |
| 2 | `index.html` | L11850-L11897 | `dividirTopicos` retorna objetos `{ numero, nivel, texto }` sem `id` | Os tópicos não possuem identificador primário estável na extração. |
| 3 | `src/data/repository.ts` | L48, L55, L70, L75 | `top_${Date.now()}_${idx}` e `mat-${Date.now()}-${idx}` ao normalizar | Normalizações sucessivas geram novos identificadores temporais. |
| 4 | `index.html` | L10779, L10789, L10790 | `nao_classificado: [...local, ...cloud]`, `pdf_annotations.concat(...)`, `pdf_bookmarks.concat(...)` | Duplicação exponencial a cada `syncDownAndMerge()`. |
| 5 | `index.html` / `src/sync/sync-queue.ts` | L9828 / L90 | `id: 'mut_' + Date.now() + ...` sem `opId` de entidade e sem compactação | Múltiplas gravações do mesmo item offline não são resumidas na última intenção. |
| 6 | `index.html` | L9941-L9956, L9923 | `window.addEventListener('online')` e `onAuthStateChange` duplicados | Múltiplos disparos simultâneos de `syncUp` competindo sem trava única. |
| 7 | `index.html` | L10150-L10179, L10300-L10360 | Ausência de `deviceId` e `contentHash` no payload | O dispositivo baixa de volta o que acabou de subir e pode re-salvar. |
| 8 | `index.html` / `src/features/auth/auth.ts` | L9932-L9935 | Logout não limpa o cache específico do usuário anterior | Contaminação cruzada de dados entre usuários no mesmo navegador. |

---

## 3. Plano de Correção por Etapas

- **Etapa 1.2:** Criar utilitário de IDs determinísticos (`top_hash(userId, editalId, materia, numero, textoNormalizado)`) e UUIDs imutáveis na criação.
- **Etapa 1.3:** Implementar Outbox idempotente com chave `opId`, compactação da fila (squash) e exclusão apenas sob confirmação do servidor.
- **Etapa 1.4:** Identificar `deviceId` único, calcular hash SHA-256 do conteúdo, ignorar eco próprio e gerenciar ouvinte único descartável.
- **Etapa 1.5:** Mesclar por chave lógica canônica, rotina de sanitização periódica e disjuntor de segurança (+20% ou >500 itens).
- **Etapa 1.6:** Suite de testes automatizados com provas reais dos 8 cenários obrigatórios e estresse de 20.000 tópicos.
