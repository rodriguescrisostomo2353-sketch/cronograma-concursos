# 🛡️ Manual do Sistema de Design: Identidade Tática Operacional (DESIGN.md)

Este documento estabelece as diretrizes visuais, tokens e componentes do **Redesign Visual Completo** do aplicativo de estudos para concursos, inspirado no estilo sóbrio, objetivo e funcional das plataformas de preparação tática/policial, com identidade visual 100% original e conformidade irrestrita com acessibilidade e performance.

---

## 🎨 1. Filosofia Visual e Diretrizes de Marca

### Princípios Fundamentais:
1. **Foco Operacional e Sobriedade:** Eliminação de ruídos visuais, efeitos excessivos de desfoque (*backdrop-blur* pesado) e elementos decorativos lentos. O estudante visualiza imediatamente sua missão diária: o que estudar, quanto estudou e quanto falta para a prova.
2. **Identidade Original e Limites Legais:**
   - O aplicativo utiliza exclusivamente o nome, logotipo e marcas próprias do projeto.
   - É terminantemente vedada a reprodução de nomes, slogans, mascotes, ícones proprietários ou qualquer propriedade intelectual de terceiros.
   - Toda a iconografia é baseada em vetores SVG geométricos puros ou de bibliotecas sob licença aberta (MIT / Apache 2.0).
3. **Alto Desempenho e Bateria:** Tipografia baseada no stack de fontes nativo do sistema operacional (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`), garantindo 0ms de bloqueio de renderização (FOIT/FOUT) e baixo consumo de GPU em celulares modestos.

---

## 🌓 2. Paleta de Cores e Tokens do Sistema

### A. Tema Escuro (Padrão Operacional)
Projetado para longas sessões de estudo noturno, com contraste balanceado sem ofuscamento:

| Token | Variável CSS | Valor Hex | Finalidade |
| :--- | :--- | :--- | :--- |
| **Fundo da Página** | `--bg-page` / `--bg-app` | `#0E1116` | Fundo principal ultraescuro suave |
| **Superfície / Cartão** | `--bg-card` | `#151A21` | Base dos cartões e contêineres |
| **Superfície Elevada** | `--bg-subtle` / `--bg-elevated` | `#1C222B` | Modais, cabeçalhos e elementos sobrepostos |
| **Bordas** | `--border-color` | `#262E39` | Divisores e bordas estruturais finas (1px) |
| **Borda em Foco** | `--border-focus` | `#F5A524` | Realce tático ao focar campos |
| **Texto Principal** | `--text-main` | `#E8ECF1` | Títulos e leitura primária |
| **Texto Secundário** | `--text-muted` | `#8B96A5` | Legendas, metadados e badges |
| **Destaque (Accent)** | `--accent-primary` | `#F5A524` | Âmbar tático de foco e ação principal |
| **Destaque Hover** | `--accent-hover` | `#E0921B` | Estado ativo do botão de destaque |
| **Sucesso** | `--color-success` | `#3DDC97` | Tópicos concluídos e metas batidas |
| **Aviso** | `--color-warning` | `#FFB020` | Alertas, revisões pendentes |
| **Erro / Perigo** | `--color-danger` | `#FF5C5C` | Exclusões, ações irreversíveis |
| **Informação** | `--color-info` | `#4DA3FF` | Dicas, metadados de edital |

### B. Tema Claro (Equivalente Diurno de Alto Contraste)
Projetado para conformidade com WCAG AA/AAA (contraste mínimo de 4.5:1 para texto normal e 3:1 para componentes visuais):

| Token | Variável CSS | Valor Hex | Finalidade |
| :--- | :--- | :--- | :--- |
| **Fundo da Página** | `--bg-page` / `--bg-app` | `#F4F6F9` | Fundo cinza suave e limpo |
| **Superfície / Cartão** | `--bg-card` | `#FFFFFF` | Cartões e painéis com fundo branco puro |
| **Superfície Elevada** | `--bg-subtle` / `--bg-elevated` | `#EDF1F6` | Áreas de agrupamento e cabeçalhos |
| **Bordas** | `--border-color` | `#D5DCE5` | Linhas de delimitação sutis |
| **Borda em Foco** | `--border-focus` | `#D97706` | Realce âmbar escuro acessível |
| **Texto Principal** | `--text-main` | `#0F172A` | Máximo contraste e legibilidade |
| **Texto Secundário** | `--text-muted` | `#525F72` | Contraste superior a 4.5:1 garantido |
| **Destaque (Accent)** | `--accent-primary` | `#D97706` | Âmbar escuro de alta visibilidade diurna |
| **Destaque Hover** | `--accent-hover` | `#B45309` | Estado hover |
| **Sucesso** | `--color-success` | `#059669` | Verde esmeralda escuro |
| **Aviso** | `--color-warning` | `#D97706` | Âmbar de aviso |
| **Erro / Perigo** | `--color-danger` | `#DC2626` | Vermelho nítido |
| **Informação** | `--color-info` | `#2563EB` | Azul tático de contraste |

### C. Paleta Harmoniosa de Disciplinas (Matérias)
Cada disciplina possui faixa lateral e crachá de identificação de fácil memorização:
- **Azul Tático:** `--pastel-blue` (`#14283E` escuro / `#E0F2FE` claro)
- **Verde Operacional:** `--pastel-green` (`#122E20` escuro / `#DCFCE7` claro)
- **Roxo Estratégico:** `--pastel-purple` (`#271C3F` escuro / `#EDE9FE` claro)
- **Âmbar Foco:** `--pastel-amber` (`#322514` escuro / `#FEF3C7` claro)
- **Rubro Alerta:** `--pastel-rose` (`#351721` escuro / `#FFE4E6` claro)
- **Teal / Ciano:** `--pastel-teal` (`#112D2A` escuro / `#CCFBF1` claro)
- **Índigo / Investigação:** `--pastel-indigo` (`#1F2349` escuro / `#E0E7FF` claro)
- **Laranja Missão:** `--pastel-peach` (`#382015` escuro / `#FFEDD5` claro)

---

## 📐 3. Tipografia e Escala Tática

A tipografia prioriza precisão de leitura e rapidez de identificação:
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", Helvetica, Arial, sans-serif;
```

### Escala de Tamanhos:
- **Título de Tela:** `22px` - `24px` (peso 700 / 800)
- **Título de Seção:** `16px` - `18px` (peso 700)
- **Subtítulo / Rótulo Tático:** `11px` - `12px` (peso 700, caixa alta `uppercase`, espaçamento entre letras `letter-spacing: 0.08em`)
- **Corpo de Texto:** `14px` - `15px` (peso 400 ou 500, `line-height: 1.5`)
- **Metadados / Legendas:** `12px` (peso 500)
- **Emblemas / Badges:** `11px` (peso 600, `line-height: 1`)

---

## 📏 4. Geometria, Espaçamentos e Sombras

1. **Grid de Espaçamentos (Múltiplos de 4px):**
   `4px` (xxs), `8px` (xs), `12px` (sm), `16px` (md), `20px` (lg), `24px` (xl), `32px` (xxl).
2. **Raio dos Cantos (Border Radius):**
   - Cartões estruturais: `14px`
   - Botões, campos de entrada e seletores: `10px`
   - Chips, emblemas e tags: `999px` (pílula)
   - Janela inferior (Bottom Sheet): cantos superiores `18px`
3. **Bordas vs. Sombras:**
   - O visual tático utiliza bordas nítidas de `1px solid var(--border-color)`.
   - Sombras leves e curtas: `0 2px 8px rgba(0,0,0,0.25)` no tema escuro e `0 2px 8px rgba(0,0,0,0.06)` no tema claro.
4. **Alvos de Toque (Touch Targets):**
   - Mínimo absoluto de `44px x 44px` para todos os botões, links e controles táteis no celular (conforme WCAG 2.5.5).
5. **Animações e Movimento:**
   - Duração curta entre `150ms` e `200ms` usando apenas `transform` e `opacity`.
   - Regra mandatória: `@media (prefers-reduced-motion: reduce)` desativa transições e animações automaticamente.

---

## 🧱 5. Biblioteca de Componentes Reutilizáveis (`src/ui`)

1. **Botões:**
   - `.btn-primary`: Destaque âmbar com texto de alto contraste.
   - `.btn-secondary`: Superfície elevada com borda tática sutil.
   - `.btn-ghost`: Transparente para ações secundárias ou ícones.
   - `.btn-danger-soft`: Fundo avermelhado discreto para operações destrutivas com confirmação.
2. **Cartões Táticos:**
   - `.tactical-card`: Superfície plana com borda limpa e raio de 14px.
   - `.session-card`: Cartão de sessão de estudo com faixa lateral colorida da disciplina.
   - `.stat-card`: Mini-cartão com rótulo tático em caixa alta, valor em destaque e indicador de progresso.
3. **Indicadores de Progresso:**
   - `.progress-ring`: Anel SVG circular com percentual numérico centralizado.
   - `.progress-bar-tactical`: Barra linear com altura de 6px ou 8px e cantos arredondados.
4. **Chips e Emblemas de Status:**
   - `.status-badge`: Pílula compacta de status (`não iniciado`, `em andamento`, `revisar`, `concluído`).
5. **Navegação:**
   - **Mobile (Bottom Bar):** Barra inferior fixa com 5 itens principais: **Hoje**, **Edital**, **Cronograma**, **Biblioteca** e **Mais**.
   - **Desktop (Sidebar):** Barra lateral recolhível fixa à esquerda com logotipo, navegação vertical e status de sincronização.
6. **Estados:**
   - **Skeleton Loader:** Efeito pulsante suave em cinza escuro para carregamento instantâneo.
   - **Empty State:** Ilustração SVG geométrica limpa com título, descrição objetiva e botão de ação primária única.
   - **Indicador de Nuvem / Offline:** Ponto tático discreto no cabeçalho (Verde = Sincronizado, Âmbar = Offline/Pendente, Vermelho = Erro).
