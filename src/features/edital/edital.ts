/**
 * Feature: Processador e Verticalizador de Edital em TypeScript
 * Extrai matérias e tópicos a partir de texto bruto copiado ou extraído de editais em PDF.
 */

import { DataRepository } from '../../data/repository';
import { eventBus } from '../../core/events';
import { Materia } from '../../types/index';

export interface SubjectHeader {
  subject: string;
  remainder: string;
}

export interface EditalParseResult {
  materias: Materia[];
  naoClassificado: string[];
}

export class EditalFeature {
  public static extractSubjectHeader(line: string): SubjectHeader | null {
    if (!line || typeof line !== 'string') return null;
    const trimmed = line.trim();
    if (!trimmed) return null;

    const match = trimmed.match(/^([A-ZÀ-Ú\s]{3,50})(?::|\s*[-–—]\s*|\s*$)/);
    if (match) {
      const subject = match[1].trim();
      const remainder = trimmed.slice(match[0].length).trim();
      return { subject, remainder };
    }
    return null;
  }

  public static parse(lines: string[] = []): EditalParseResult {
    if (!Array.isArray(lines)) return { materias: [], naoClassificado: [] };

    const materiasSections: { nome: string; lines: string[] }[] = [];
    const naoClassificado: string[] = [];
    let currentSection: { nome: string; lines: string[] } | null = null;

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
      let topicos: any[] = [];

      if (typeof window !== 'undefined' && (window as any).dividirTopicos) {
        const divRes = (window as any).dividirTopicos(fullText);
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
      })!;
    }).filter(Boolean);

    const resultado: EditalParseResult = { materias, naoClassificado };
    eventBus.emit('edital:parsed', resultado);
    return resultado;
  }
}

declare global {
  interface Window {
    EditalFeature?: typeof EditalFeature;
    dividirTopicos?: (text: string) => { topicos: any[] };
  }
}

if (typeof window !== 'undefined') {
  window.EditalFeature = EditalFeature;
}
