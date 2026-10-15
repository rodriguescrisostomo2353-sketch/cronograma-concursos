/**
 * Camada de Dados Única (Padrão Repositório)
 * Centraliza toda leitura, escrita e normalização de dados do aplicativo.
 * Nenhuma tela manipula o localStorage diretamente.
 */

import { getLocalDateString } from '../core/date-utils.js';
import { eventBus } from '../core/events.js';

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
};

export const CURRENT_DATA_VERSION = 1;

export class DataRepository {
  static _saveTimer = null;

  // ==========================================
  // HELPERS DE NORMALIZAÇÃO
  // ==========================================
  static normalizarTopicos(topicos = []) {
    if (!Array.isArray(topicos)) return [];
    return topicos.map((topico, idx) => {
      if (typeof topico === 'string') {
        return {
          id: `top_${Date.now()}_${idx}`,
          texto: topico.trim(),
          concluido: false
        };
      }
      if (topico && typeof topico === 'object') {
        return {
          id: topico.id || `top_${Date.now()}_${idx}`,
          texto: String(topico.texto || topico.nome || topico.title || '').trim(),
          concluido: Boolean(topico.concluido || topico.completed || topico.done)
        };
      }
      return null;
    }).filter(Boolean);
  }

  static normalizarMateria(materia, idx = 0) {
    if (!materia) return null;
    if (typeof materia === 'string') {
      return {
        id: `mat-${Date.now()}-${idx}`,
        nome: materia.trim(),
        topicos: []
      };
    }
    const id = materia.id || `mat-${Date.now()}-${idx}`;
    const nome = String(materia.nome || materia.name || materia.titulo || 'Disciplina').trim();
    const topicos = this.normalizarTopicos(materia.topicos || materia.topics || []);
    return {
      ...materia,
      id,
      nome,
      topicos
    };
  }

  static normalizarMaterias(materias = []) {
    if (!Array.isArray(materias)) return [];
    return materias.map((m, idx) => this.normalizarMateria(m, idx)).filter(Boolean);
  }

  // ==========================================
  // VERSIONAMENTO E MIGRAÇÕES
  // ==========================================
  static obterDataVersion() {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
      return v ? parseInt(v, 10) : 0;
    } catch {
      return 0;
    }
  }

  static executarMigracoes() {
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
  static obterMaterias() {
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

  static salvarMaterias(materias = []) {
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

  static obterNaoClassificado() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APP_DATA);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed?.naoClassificado || [];
    } catch {
      return [];
    }
  }

  static salvarNaoClassificado(itens = []) {
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
  static obterCronogramas() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULES_LIST);
      if (!raw) return [];
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  static obterCronogramaAtivo() {
    const list = this.obterCronogramas();
    if (list.length === 0) return null;
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SCHEDULE_ID);
    return list.find(s => s.id === activeId) || list[0];
  }

  static salvarCronogramas(schedules = [], activeId = null) {
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

  static obterSlotsConcluidos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPLETED_SLOTS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  static alternarSlotConcluido(slotKey) {
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
  static obterRegistrosEstudo() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STUDY_LOG);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static registrarEstudo(registro) {
    try {
      const log = this.obterRegistrosEstudo();
      const novoRegistro = {
        id: registro.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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

  static obterRevisoesEspacadas() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SPACED_REVIEWS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static salvarRevisoesEspacadas(reviews = []) {
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
  static exportarPayloadCompleto() {
    return {
      app: 'Cronograma de Estudos para Concursos',
      version: typeof window !== 'undefined' && window.APP_VERSION ? window.APP_VERSION : '1.7.5',
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

  static restaurarPayload(payload) {
    if (!payload || !payload.data) {
      throw new Error('Formato de backup inválido.');
    }
    // Cria backup de segurança antes de restaurar
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
  // DISPATCHER DE SINCRONIZAÇÃO
  // ==========================================
  static _agendarSync() {
    if (typeof window !== 'undefined' && window.SyncManager && typeof window.SyncManager.debouncedSync === 'function') {
      window.SyncManager.debouncedSync();
    }
  }
}

if (typeof window !== 'undefined') {
  window.DataRepository = DataRepository;
}
