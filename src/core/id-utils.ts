/**
 * Utilitário de Identificadores Estáveis e Determinísticos (Anti-Duplicação)
 * Garante que:
 * 1. Itens criados pelo usuário recebam um UUID único gerado uma só vez.
 * 2. Itens derivados do edital (matérias e tópicos) tenham IDs DETERMINÍSTICOS estáveis baseados em hash de seus conteúdos.
 * 3. Reprocessar o mesmo edital gera exatamente os mesmos IDs, prevenindo duplicações.
 */

// Algoritmo de hash determinístico rápido e estável (cyrb53 / FNV-1a 64-bit)
export function stableHashString(str: string, seed: number = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  const s = String(str || '');
  for (let i = 0, ch; i < s.length; i++) {
    ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashVal = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hashVal.toString(36).padStart(11, '0');
}

/**
 * Normaliza strings para hashing: remove pontuações redundantes, espaços múltiplos e acentos.
 */
export function normalizeKey(text: string): string {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Gera um UUID v4 padrão RFC 4122
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * ID Determinístico para Matéria do Edital
 */
export function getMateriaId(nome: string, editalId: string = 'default', existingId?: string): string {
  if (existingId && typeof existingId === 'string' && existingId.trim() && !existingId.startsWith('mat-temp-')) {
    return existingId.trim();
  }
  const cleanName = normalizeKey(nome);
  const cleanEdital = normalizeKey(editalId);
  const hash = stableHashString(`${cleanEdital}::${cleanName}`);
  return `mat_${hash}`;
}

/**
 * ID Determinístico para Tópico de Edital
 */
export function getTopicoId(
  materiaNomeOrId: string,
  numero: string | number | null | undefined,
  texto: string,
  editalId: string = 'default',
  existingId?: string
): string {
  if (existingId && typeof existingId === 'string' && existingId.trim() && !existingId.startsWith('top-temp-')) {
    return existingId.trim();
  }
  const cleanEdital = normalizeKey(editalId);
  const cleanMat = normalizeKey(materiaNomeOrId);
  const cleanNum = numero ? String(numero).trim() : '';
  const cleanText = normalizeKey(texto);

  // Chave lógica composta única do tópico
  const key = `${cleanEdital}::${cleanMat}::${cleanNum}::${cleanText}`;
  const hash = stableHashString(key);
  return `top_${hash}`;
}

/**
 * ID Imutável para Registro de Estudo / Sessão
 */
export function getStudyLogId(existingId?: string): string {
  if (existingId && typeof existingId === 'string' && existingId.trim()) {
    return existingId.trim();
  }
  return `log_${generateUUID()}`;
}

/**
 * ID Imutável para Cronograma
 */
export function getScheduleId(nome: string, existingId?: string): string {
  if (existingId && typeof existingId === 'string' && existingId.trim()) {
    return existingId.trim();
  }
  const cleanName = normalizeKey(nome);
  const hash = stableHashString(`sched::${cleanName}::${Date.now()}`);
  return `sch_${hash}`;
}

/**
 * ID de Operação da Fila Outbox (idempotência de envio)
 */
export function getOperationId(opType: string, entityId: string): string {
  return `op_${opType}_${entityId}_${stableHashString(`${opType}:${entityId}`)}`;
}

// Expõe globalmente caso necessário em ambientes híbridos
if (typeof window !== 'undefined') {
  (window as any).IdUtils = {
    stableHashString,
    normalizeKey,
    generateUUID,
    getMateriaId,
    getTopicoId,
    getStudyLogId,
    getScheduleId,
    getOperationId
  };
}
