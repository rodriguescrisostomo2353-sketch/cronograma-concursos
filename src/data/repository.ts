/**
 * Camada de Dados Única em TypeScript (Padrão Repositório)
 * Centraliza toda leitura, escrita e normalização de dados do aplicativo.
 * Nenhuma tela manipula o localStorage diretamente.
 */

import { getLocalDateString } from '../core/date-utils';
import { eventBus } from '../core/events';
import { getMateriaId, getTopicoId, getStudyLogId } from '../core/id-utils';
import {
  Materia,
  Topico,
  Cronograma,
  StudyLogEntry,
  SpacedReview,
  BackupPayload
} from '../types/index';

export const STORAGE_KEYS = {
  DATA_VERSION: 'concurso_data_version',
  APP_DATA: 'concurso_app_data',
  SCHEDULES_LIST: 'concurso_schedules_list',
  ACTIVE_SCHEDULE_ID: 'concurso_active_schedule_id',
  SCHEDULE_DATA: 'concurso_schedule_data',
  COMPLETED_SLOTS: 'concurso_completed_slots',
  SUBJECT_PRIORITIES: 'concurso_subject_priorities',
  EXAM_TARGET: 'concurso_exam_target',
  SPACED_REVIEWS: 'concurso_spaced_reviews',
  SESSION_BREAK_MIN: 'concurso_session_break_min',
  WEEKLY_REVIEW_CONFIG: 'concurso_weekly_review_config',
  STUDY_LOG: 'concurso_study_log',
  AUTO_SCHEDULE_CONFIG: 'concurso_auto_config',
  BACKUP_SAFETY_V170: 'concurso_app_data_backup_v170'
} as const;

export const CURRENT_DATA_VERSION = 1;

export class DataRepository {
  private static _saveTimer: any = null;

  // ==========================================
  // HELPERS DE NORMALIZAÇÃO
  // ==========================================
  static normalizarTopicos(topicos: any[] = [], materiaNome = 'default'): Topico[] {
    if (!Array.isArray(topicos)) return [];
    return topicos.map((topico, idx): Topico | null => {
      if (typeof topico === 'string') {
        const txt = topico.trim();
        return {
          id: getTopicoId(materiaNome, idx + 1, txt),
          texto: txt,
          concluido: false
        };
      }
      if (topico && typeof topico === 'object') {
        const txt = String(topico.texto || topico.nome || topico.title || '').trim();
        const num = topico.numero ?? (idx + 1);
        return {
          id: getTopicoId(materiaNome, num, txt, undefined, topico.id),
          numero: topico.numero,
          nivel: topico.nivel,
          texto: txt,
          concluido: Boolean(topico.concluido || topico.completed || topico.done),
          prioridade: topico.prioridade || 'media',
          anotacoes: topico.anotacoes || ''
        };
      }
      return null;
    }).filter((t): t is Topico => t !== null);
  }

  static normalizarMateria(materia: any, idx = 0): Materia | null {
    if (!materia) return null;
    if (typeof materia === 'string') {
      const nome = materia.trim();
      return {
        id: getMateriaId(nome),
        nome,
        topicos: []
      };
    }
    const nome = String(materia.nome || materia.name || materia.titulo || 'Disciplina').trim();
    const id = getMateriaId(nome, undefined, materia.id);
    const topicos = this.normalizarTopicos(materia.topicos || materia.topics || [], nome);
    return {
      ...materia,
      id,
      nome,
      topicos
    };
  }

  static normalizarMaterias(materias: any[] = []): Materia[] {
    if (!Array.isArray(materias)) return [];
    return materias.map((m, idx) => this.normalizarMateria(m, idx)).filter((m): m is Materia => m !== null);
  }

  // ==========================================
  // VERSIONAMENTO E MIGRAÇÕES
  // ==========================================
  static obterDataVersion(): number {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
      return v ? parseInt(v, 10) : 0;
    } catch {
      return 0;
    }
  }

  static executarMigracoes(): void {
    const version = this.obterDataVersion();
    if (version < CURRENT_DATA_VERSION) {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.APP_DATA);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.materias)) {
            parsed.materias = this.normalizarMaterias(parsed.materias);
            parsed.dataVersion = CURRENT_DATA_VERSION;
            localStorage.setItem(STORAGE_KEYS.APP_DATA, JSON.stringify(parsed));
          }
        }
        localStorage.setItem(STORAGE_KEYS.DATA_VERSION, String(CURRENT_DATA_VERSION));
      } catch (err) {
        console.error('[DataRepository] Erro durante migração de esquema:', err);
      }
    }
  }

  // ==========================================
  // ACESSO A MATÉRIAS
  // ==========================================
  static obterMaterias(): Materia[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APP_DATA);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return this.normalizarMaterias(parsed?.materias || []);
    } catch (err) {
      console.error('[DataRepository] Erro ao ler matérias:', err);
      return [];
    }
  }

  static salvarMaterias(materias: any[] = []): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APP_DATA);
      const appData = raw ? JSON.parse(raw) : { materias: [], naoClassificado: [] };
      appData.materias = this.normalizarMaterias(materias);
      appData.dataVersion = CURRENT_DATA_VERSION;
      localStorage.setItem(STORAGE_KEYS.APP_DATA, JSON.stringify(appData));
      eventBus.emit('materias:changed', appData.materias);
      this._agendarSync();
      return true;
    } catch (err) {
      console.error('[DataRepository] Erro ao salvar matérias:', err);
      return false;
    }
  }

  static obterNaoClassificado(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APP_DATA);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed?.naoClassificado || [];
    } catch {
      return [];
    }
  }

  static salvarNaoClassificado(itens: string[] = []): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APP_DATA);
      const appData = raw ? JSON.parse(raw) : { materias: [], naoClassificado: [] };
      appData.naoClassificado = itens;
      localStorage.setItem(STORAGE_KEYS.APP_DATA, JSON.stringify(appData));
      eventBus.emit('naoClassificado:changed', itens);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // CRONOGRAMAS
  // ==========================================
  static obterCronogramas(): Cronograma[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULES_LIST);
      if (!raw) return [];
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  static obterCronogramaAtivo(): Cronograma | null {
    const list = this.obterCronogramas();
    if (list.length === 0) return null;
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SCHEDULE_ID);
    return list.find(s => s.id === activeId) || list[0];
  }

  static salvarCronogramas(schedules: Cronograma[] = [], activeId: string | null = null): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES_LIST, JSON.stringify(schedules));
      if (activeId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SCHEDULE_ID, activeId);
        const active = schedules.find(s => s.id === activeId);
        if (active) {
          localStorage.setItem(STORAGE_KEYS.SCHEDULE_DATA, JSON.stringify(active));
        }
      }
      eventBus.emit('cronogramas:changed', { schedules, activeId });
      this._agendarSync();
      return true;
    } catch (err) {
      console.error('[DataRepository] Erro ao salvar cronogramas:', err);
      return false;
    }
  }

  static obterSlotsConcluidos(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPLETED_SLOTS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  static alternarSlotConcluido(slotKey: string): boolean {
    try {
      const slots = this.obterSlotsConcluidos();
      slots[slotKey] = !slots[slotKey];
      localStorage.setItem(STORAGE_KEYS.COMPLETED_SLOTS, JSON.stringify(slots));
      eventBus.emit('slots:changed', slots);
      this._agendarSync();
      return slots[slotKey];
    } catch {
      return false;
    }
  }

  // ==========================================
  // REGISTROS DE ESTUDO & REVISÕES
  // ==========================================
  static obterRegistrosEstudo(): StudyLogEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STUDY_LOG);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static registrarEstudo(registro: Partial<StudyLogEntry>): StudyLogEntry | null {
    try {
      const log = this.obterRegistrosEstudo();
      const novoRegistro: StudyLogEntry = {
        id: getStudyLogId(registro.id),
        data: registro.data || getLocalDateString(),
        topicoId: registro.topicoId || null,
        topicoNome: registro.topicoNome || '',
        materiaId: registro.materiaId || '',
        materiaNome: registro.materiaNome || '',
        minutos: Math.max(1, Math.round(Number(registro.minutos) || 0)),
        criadoEm: registro.criadoEm || new Date().toLocaleString('pt-BR'),
        origem: registro.origem || 'manual',
        updatedAt: new Date().toISOString()
      };
      log.unshift(novoRegistro);
      localStorage.setItem(STORAGE_KEYS.STUDY_LOG, JSON.stringify(log));
      eventBus.emit('estudo:registrado', novoRegistro);
      this._agendarSync();
      return novoRegistro;
    } catch (err) {
      console.error('[DataRepository] Erro ao registrar estudo:', err);
      return null;
    }
  }

  static obterRevisoesEspacadas(): SpacedReview[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SPACED_REVIEWS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static salvarRevisoesEspacadas(reviews: SpacedReview[] = []): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.SPACED_REVIEWS, JSON.stringify(reviews));
      eventBus.emit('revisoes:changed', reviews);
      this._agendarSync();
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // BACKUP E RESTAURAÇÃO
  // ==========================================
  static exportarPayloadCompleto(): BackupPayload {
    return {
      app: 'Cronograma de Estudos para Concursos',
      version: typeof window !== 'undefined' && (window as any).APP_VERSION ? (window as any).APP_VERSION : '1.8.0',
      exportDate: new Date().toISOString(),
      exportDateFormatted: new Date().toLocaleString('pt-BR'),
      dataVersion: CURRENT_DATA_VERSION,
      summary: {
        materiasCount: this.obterMaterias().length,
        schedulesCount: this.obterCronogramas().length,
        studyLogsCount: this.obterRegistrosEstudo().length
      },
      data: {
        materias: this.obterMaterias(),
        naoClassificado: this.obterNaoClassificado(),
        dataVersion: CURRENT_DATA_VERSION
      },
      schedules: this.obterCronogramas(),
      activeScheduleId: localStorage.getItem(STORAGE_KEYS.ACTIVE_SCHEDULE_ID),
      completedSlots: this.obterSlotsConcluidos(),
      spacedReviews: this.obterRevisoesEspacadas(),
      studyLog: this.obterRegistrosEstudo()
    };
  }

  static restaurarPayload(payload: any): boolean {
    if (!payload || !payload.data) {
      throw new Error('Formato de backup inválido.');
    }
    const atual = this.exportarPayloadCompleto();
    localStorage.setItem('concurso_backup_pre_restore', JSON.stringify(atual));

    if (payload.data && Array.isArray(payload.data.materias)) {
      this.salvarMaterias(payload.data.materias);
    }
    if (payload.data && Array.isArray(payload.data.naoClassificado)) {
      this.salvarNaoClassificado(payload.data.naoClassificado);
    }
    if (Array.isArray(payload.schedules)) {
      this.salvarCronogramas(payload.schedules, payload.activeScheduleId);
    }
    if (payload.completedSlots && typeof payload.completedSlots === 'object') {
      localStorage.setItem(STORAGE_KEYS.COMPLETED_SLOTS, JSON.stringify(payload.completedSlots));
    }
    if (Array.isArray(payload.spacedReviews)) {
      this.salvarRevisoesEspacadas(payload.spacedReviews);
    }
    if (Array.isArray(payload.studyLog)) {
      localStorage.setItem(STORAGE_KEYS.STUDY_LOG, JSON.stringify(payload.studyLog));
    }

    eventBus.emit('data:restored', payload);
    return true;
  }

  // ==========================================
  // MESCLAGEM POR CHAVE LÓGICA E DISJUNTOR (Etapa 1.5)
  // ==========================================
  static mesclarMaterias(locais: Materia[] = [], remotas: Materia[] = []): Materia[] {
    const normalizadasLocais = this.normalizarMaterias(locais);
    const normalizadasRemotas = this.normalizarMaterias(remotas);
    const resultado: Materia[] = [...normalizadasLocais];

    for (const rMat of normalizadasRemotas) {
      const rNomeNorm = (rMat.nome || '').trim().toLowerCase();
      const existing = resultado.find(m => {
        const mNomeNorm = (m.nome || '').trim().toLowerCase();
        return (m.id && rMat.id && m.id === rMat.id) || (mNomeNorm && rNomeNorm && mNomeNorm === rNomeNorm);
      });

      if (!existing) {
        resultado.push(rMat);
      } else {
        const existingTopicos = existing.topicos || [];
        const remoteTopicos = rMat.topicos || [];
        for (const rt of remoteTopicos) {
          const rtTextNorm = (rt.texto || '').trim().toLowerCase();
          const hasTopic = existingTopicos.find(et => {
            const etTextNorm = (et.texto || '').trim().toLowerCase();
            return (et.id && rt.id && et.id === rt.id) || 
                   (et.numero !== undefined && rt.numero !== undefined && et.numero !== null && rt.numero !== null && String(et.numero) === String(rt.numero)) ||
                   (etTextNorm && rtTextNorm && etTextNorm === rtTextNorm);
          });

          if (!hasTopic) {
            existingTopicos.push(rt);
          } else {
            if (rt.concluido) hasTopic.concluido = true;
            if (!hasTopic.anotacoes && rt.anotacoes) hasTopic.anotacoes = rt.anotacoes;
            if (!hasTopic.prioridade && rt.prioridade) hasTopic.prioridade = rt.prioridade;
          }
        }
        existing.topicos = existingTopicos;
      }
    }
    return resultado;
  }

  static verificarLimiteSeguranca(totalAnterior: number, totalNovo: number, permitirOverride = false): { ok: boolean; delta: number; percentual: number; motivo?: string } {
    if (permitirOverride) {
      return { ok: true, delta: totalNovo - totalAnterior, percentual: 0 };
    }
    const delta = totalNovo - totalAnterior;
    const percentual = totalAnterior > 0 ? (delta / totalAnterior) * 100 : 0;
    if (delta > 500 && percentual > 20) {
      return {
        ok: false,
        delta,
        percentual,
        motivo: `Crescimento de dados acima do limite de segurança (+${delta} itens, +${percentual.toFixed(1)}%). Proteção anti-duplicação ativada.`
      };
    }
    return { ok: true, delta, percentual };
  }

  private static _agendarSync(): void {
    if (typeof window !== 'undefined' && (window as any).SyncManager && typeof (window as any).SyncManager.debouncedSync === 'function') {
      (window as any).SyncManager.debouncedSync();
    }
  }
}

declare global {
  interface Window {
    DataRepository?: typeof DataRepository;
  }
}

if (typeof window !== 'undefined') {
  window.DataRepository = DataRepository;
}
