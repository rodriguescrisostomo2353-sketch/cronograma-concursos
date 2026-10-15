const fs = require('fs');

const REF_ANTES = /(?:\b(?:lei|leis|decreto|decreto-lei|resolu[çc][ãa]o|portaria|s[úu]mula|artigo|art|arts|inciso|n[ºo°]|nº)\.?|§)\s*$/i;

function normalizarTexto(t) {
  return String(t)
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dividirTopicos(textoBruto) {
  const texto = normalizarTexto(textoBruto);
  const re = /(^|[\s;:.,)])(\d{1,2}(?:\.\d{1,2})*)(\.?)(?=\s+[A-Za-zÀ-ÿ(\["“])/g;

  let achados = [];
  let m;
  let count = 0;
  while ((m = re.exec(texto)) !== null) {
    count++;
    if (count > 10000) {
      console.error('INFINITE LOOP DETECTED in dividirTopicos!');
      break;
    }
    const inicio = m.index + m[1].length;
    const numero = m[2];
    const partes = numero.split('.').map(Number);
    const terminaComPonto = m[3] === '.';
    if (partes.length < 2 && !terminaComPonto) continue;
    if (REF_ANTES.test(texto.slice(Math.max(0, inicio - 15), inicio))) continue;
    achados.push({ inicio, numero, partes, nivel: partes.length });
  }

  return { achadosCount: achados.length, totalMatches: count };
}

const sampleDireitoAdmin = `
1 Estado, governo e administração pública: conceitos, elementos, poderes e organização; natureza, fins e princípios. 2 Direito administrativo: conceito, fontes e princípios. 3 Organização administrativa da União; administração direta e indireta. 4 Agentes públicos: espécies e classificação; poderes, deveres e prerrogativas; cargo, emprego e função públicos; regime jurídico único: provimento, vacância, remoção, redistribuição e substituição; direitos e vantagens; regime disciplinar; responsabilidade civil, criminal e administrativa. 5 Poderes administrativos: poder vinculado; poder discricionário; poder hierárquico; poder disciplinar; poder regulamentar; poder de polícia; uso e abuso do poder. 6 Serviços públicos: conceito, classificação, regulamentação e controle; forma, meios e requisitos; delegação: concessão, permissão, autorização. 7 Controle e responsabilização da administração: controle administrativo; controle judicial; controle legislativo; responsabilidade civil do Estado. 8 Lei nº 8.112/1990 e alterações. 9 Lei nº 8.666/1993 e Lei nº 14.133/2021 (licitações e contratos administrativos). 10 Processo administrativo federal (Lei nº 9.784/1999).
`;

console.log('Testing dividirTopicos with sample Direito Administrativo:');
const t0 = Date.now();
const res = dividirTopicos(sampleDireitoAdmin);
console.log('Finished in', Date.now() - t0, 'ms:', res);
