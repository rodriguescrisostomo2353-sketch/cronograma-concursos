import { normalizarTexto, dividirTopicos } from './divisor-topicos.js';

const testA = "7.1 Perícias e Peritos. 7.1.1 Documentos médico-legais. 7.1.2 Quesitos oficiais. 7.1.3 Perícias médicas. 7.1.4 Ética médica e pericial. 7.1.5 Legislação sobre perícias médico-legais. 7.2 Antropologia Médico-legal. 7.2.1 Identidade e identificação. 7.2.2 Identificação judiciária. 7.3 Traumatologia Médico-legal. 7.3.1 Lesões corporais sob o ponto de vista jurídico.";

const testB = "1.1. Administração Pública. 1.1.1.1 Conceito e princípios. 1.1.1.2 Administração pública direta e indireta. 1.1.2 Agentes públicos. 1.1.2.1 Conceito. 1.1.2.2 Classificação (espécie). 1.1.2.3 Cargo Público, emprego público e função pública. 1.1.2.4 Direitos e deveres. 1.1.2.5 Responsabilidade administrativa, civil e penal. 1.1.3 Lei 8.429/92 e alterações (Lei de improbidade administrativa). 1.1.4 Poderes da Administração Pública: 1.1.4.1 Poder hierárquico. 1.1.4.2 Poder Disciplinar. 1.1.4.3 Poder Regulamentar. 1.1.4.4 Poder de Polícia. 1.1.5 Fatos e atos administrativos: 1.1.5.1 Conceito. 1.1.5.2 Requisitos do ato administrativo. 1.1.5.3 Atributos do ato administrativo. 1.1.5.4 Classificação. 1.1.5.5 Revogação e anulação. 1.1.6 Serviços públicos: 1.1.6.1 Conceito. 1.1.6.2 Princípios. 1.1.7 Responsabilidade civil do Estado. 1.1.8 Regime jurídico administrativo.";

const testC = "1.1 Interpretação e compreensão de textos: 1.1.1 Identificação de tipos textuais: narrativo, descritivo e dissertativo; 1.1.2 Critérios de textualidade: coerência e coesão; 1.1.3 Recursos de construção textual: fonológicos, morfológicos, sintáticos e semânticos; 1.1.4 Gêneros textuais da Redação Oficial; 1.1.4.1 Princípios gerais; 1.1.4.2 Uso dos pronomes de tratamento; 1.1.4.3 Estrutura interna dos gêneros: ofício, memorando, requerimento, relatório, parecer. 1.2 Conhecimentos linguísticos: 1.2.1 Conhecimentos gramaticais conforme padrão formal da língua; 1.2.2 Princípios gerais de leitura e produção de texto.";

console.log("=== EXECUTANDO TESTE A (Medicina Legal) ===");
const resA = dividirTopicos(testA);
console.log("Falhou:", resA.falhou, resA.motivo || "");
console.log("Qtd tópicos:", resA.topicos.length, "(Esperado: 11)");
console.log("Números:", resA.topicos.map(t => t.numero).join(", "));
console.log("Primeiros 3:");
resA.topicos.slice(0, 3).forEach((t, i) => console.log(` [${i+1}] (${t.numero}) ${t.texto}`));
console.log("Últimos 3:");
resA.topicos.slice(-3).forEach((t, i) => console.log(` [${resA.topicos.length - 3 + i + 1}] (${t.numero}) ${t.texto}`));

console.log("\n=== EXECUTANDO TESTE B (Direito Administrativo) ===");
const resB = dividirTopicos(testB);
console.log("Falhou:", resB.falhou, resB.motivo || "");
console.log("Qtd tópicos:", resB.topicos.length, "(Esperado: 26)");
console.log("Números:", resB.topicos.map(t => t.numero).join(", "));
console.log("Primeiros 3:");
resB.topicos.slice(0, 3).forEach((t, i) => console.log(` [${i+1}] (${t.numero}) ${t.texto}`));
console.log("Últimos 3:");
resB.topicos.slice(-3).forEach((t, i) => console.log(` [${resB.topicos.length - 3 + i + 1}] (${t.numero}) ${t.texto}`));
const t113 = resB.topicos.find(t => t.numero === '1.1.3');
console.log("Item 1.1.3 contém Lei 8.429/92:", t113 && t113.texto.includes('Lei 8.429/92') ? 'SIM -> ' + t113.texto : 'NÃO');

console.log("\n=== EXECUTANDO TESTE C (Língua Portuguesa) ===");
const resC = dividirTopicos(testC);
console.log("Falhou:", resC.falhou, resC.motivo || "");
console.log("Qtd tópicos:", resC.topicos.length, "(Esperado: 11)");
console.log("Números:", resC.topicos.map(t => t.numero).join(", "));
console.log("Primeiros 3:");
resC.topicos.slice(0, 3).forEach((t, i) => console.log(` [${i+1}] (${t.numero}) ${t.texto}`));
console.log("Últimos 3:");
resC.topicos.slice(-3).forEach((t, i) => console.log(` [${resC.topicos.length - 3 + i + 1}] (${t.numero}) ${t.texto}`));
