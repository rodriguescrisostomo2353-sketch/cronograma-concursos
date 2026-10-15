const REF_ANTES = /(?:\b(?:lei|leis|decreto|decreto-lei|resolu[çc][ãa]o|portaria|s[úu]mula|artigo|art|arts|inciso|n[ºo°]|nº)\.?|§)\s*$/i;

export function normalizarTexto(t) {
  return String(t)
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function dividirTopicos(textoBruto) {
  const texto = normalizarTexto(textoBruto);

  // número hierárquico (7.1 | 7.1.1 | 1.1.1.1 | 3.) seguido de espaço e letra
  const re = /(^|[\s;:.,)])(\d{1,2}(?:\.\d{1,2})*)(\.?)(?=\s+[A-Za-zÀ-ÿ(\["“])/g;

  let achados = [];
  let m;
  while ((m = re.exec(texto)) !== null) {
    const inicio = m.index + m[1].length;
    const numero = m[2];
    const partes = numero.split('.').map(Number);
    const terminaComPonto = m[3] === '.';
    // precisa ter pelo menos um nível com ponto (7.1) OU terminar com ponto (3.)
    if (partes.length < 2 && !terminaComPonto) continue;
    // ignorar referências tipo "Lei 8.", "art. 5.", "nº 3."
    if (REF_ANTES.test(texto.slice(Math.max(0, inicio - 15), inicio))) continue;
    achados.push({ inicio, numero, partes, nivel: partes.length });
  }

  // manter só os números da raiz dominante (ex.: tudo que começa com "7")
  if (achados.length) {
    const contagem = {};
    achados.forEach(a => { contagem[a.partes[0]] = (contagem[a.partes[0]] || 0) + 1; });
    const raiz = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0];
    achados = achados.filter(a => String(a.partes[0]) === raiz);
  }

  // trava de segurança: poucos números encontrados em texto grande = falha
  if (achados.length < 2 && texto.length > 400) {
    return { topicos: [{ numero: null, nivel: 1, texto }], falhou: true, motivo: 'Poucos números encontrados' };
  }

  const topicos = [];
  if (achados.length && achados[0].inicio > 0) {
    const intro = texto.slice(0, achados[0].inicio).trim();
    if (intro) topicos.push({ numero: null, nivel: 0, texto: intro });
  }
  achados.forEach((a, i) => {
    const fim = i + 1 < achados.length ? achados[i + 1].inicio : texto.length;
    topicos.push({ numero: a.numero, nivel: a.nivel, texto: texto.slice(a.inicio, fim).trim() });
  });

  // teste de integridade: nada pode se perder
  const junto = normalizarTexto(topicos.map(t => t.texto).join(' '));
  const falhou = junto !== texto;
  return { topicos, falhou, motivo: falhou ? 'Perda de texto na divisão' : null };
}

if (typeof window !== 'undefined') {
  window.normalizarTexto = normalizarTexto;
  window.dividirTopicos = dividirTopicos;
}
