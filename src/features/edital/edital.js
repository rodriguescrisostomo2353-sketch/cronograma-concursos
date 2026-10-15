/**
 * Feature: Processador e Verticalizador de Edital
 * Extrai matérias e tópicos a partir de texto bruto copiado ou extraído de editais em PDF.
 */

import { DataRepository } from '../../data/repository.js';
import { eventBus } from '../../core/events.js';

export class EditalFeature {
  static extractSubjectHeader(line) {
    if (!line || typeof line !== 'string') return null;
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Padrões de cabeçalho: "LÍNGUA PORTUGUESA:", "NOÇÕES DE DIREITO CONSTITUCIONAL", etc.
    const match = trimmed.match(/^([A-ZÀ-Ú\s]{3,50})(?::|\s*[-–—]\s*|\s*$)/);
    if (match) {
      const subject = match[1].trim();
      const remainder = trimmed.slice(match[0].length).trim();
      return { subject, remainder };
    }
    return null;
  }

  static parse(lines = []) {
    if (!Array.isArray(lines)) return { materias: [], naoClassificado: [] };

    const materiasSections = [];
    const naoClassificado = [];
    let currentSection = null;

    const palettes = ['blue', 'green', 'purple', 'amber', 'rose', 'teal', 'indigo', 'peach'];

    for (const rawLine of lines) {
      const line = String(rawLine || '').trim();
      if (!line) continue;

      const header = this.extractSubjectHeader(line);
      if (header && header.subject.length > 2) {
        currentSection = {
          nome: header.subject,
          lines: header.remainder ? [header.remainder] : []
        };
        materiasSections.push(currentSection);
        continue;
      }

      if (currentSection) {
        currentSection.lines.push(line);
      } else {
        naoClassificado.push(line);
      }
    }

    const materias = materiasSections.map((sec, idx) => {
      const fullText = sec.lines.join(' ').trim();
      let topicos = [];

      if (typeof window !== 'undefined' && window.dividirTopicos) {
        const divRes = window.dividirTopicos(fullText);
        if (divRes && divRes.topicos) {
          topicos = divRes.topicos;
        }
      }

      if (topicos.length === 0 && fullText) {
        topicos = [{ id: `top_${Date.now()}_0`, texto: fullText, concluido: false }];
      }

      return DataRepository.normalizarMateria({
        id: `mat-${Date.now()}-${idx}`,
        nome: sec.nome,
        paletteId: palettes[idx % palettes.length],
        topicos
      });
    });

    const resultado = { materias, naoClassificado };
    eventBus.emit('edital:parsed', resultado);
    return resultado;
  }
}

if (typeof window !== 'undefined') {
  window.EditalFeature = EditalFeature;
}
