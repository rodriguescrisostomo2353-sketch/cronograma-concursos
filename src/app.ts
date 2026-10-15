/**
 * Orquestrador Central da Aplicação em TypeScript (App Core)
 * Consolida a lógica funcional do site que residia dentro do HTML.
 */

import { Materia, Topico, Cronograma, StudyLogEntry, BackupPayload } from './types/index';
import { DataRepository } from './data/repository';
import { eventBus } from './core/events';
import { getLocalDateString, formatDateBR, formatMinutesHuman } from './core/date-utils';
import { ErrorBoundary } from './core/error-boundary';
import { MateriasFeature } from './features/materias/materias';
import { CronogramaFeature } from './features/cronograma/cronograma';
import { EditalFeature } from './features/edital/edital';
import { HorasEstudoFeature } from './features/horas-estudo/horas-estudo';
import { BibliotecaFeature } from './features/biblioteca/biblioteca';
import { AuthFeature } from './features/auth/auth';
import { ToastUI } from './ui/toast';
import { ModalUI } from './ui/modal';

export class AppCore {
  public static version: string = '1.8.0';

  /**
   * Inicialização central do aplicativo
   */
  public static init(): void {
    ErrorBoundary.safeRun('AppCore:init', () => {
      DataRepository.executarMigracoes();
      this.aplicarTemaSalvo();
      console.log(`[AppCore] Cronograma de Estudos v${this.version} inicializado em TypeScript.`);
    });
  }

  /**
   * Gerenciamento de Temas (Claro / Escuro)
   */
  public static aplicarTemaSalvo(): void {
    if (typeof localStorage === 'undefined' || typeof document === 'undefined') return;
    const salvo = localStorage.getItem('concurso_theme') || 'light';
    this.definirTema(salvo);
  }

  public static definirTema(tema: string): void {
    if (typeof document === 'undefined') return;
    const t = tema === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('concurso_theme', t);
    eventBus.emit('theme:changed', t);
  }

  public static alternarTema(): string {
    const atual = localStorage.getItem('concurso_theme') || 'light';
    const novo = atual === 'dark' ? 'light' : 'dark';
    this.definirTema(novo);
    return novo;
  }

  /**
   * Gestão de Matérias e Tópicos
   */
  public static obterMaterias(): Materia[] {
    return MateriasFeature.listar();
  }

  public static salvarMaterias(materias: Materia[]): boolean {
    return DataRepository.salvarMaterias(materias);
  }

  public static alternarTopico(materiaId: string, topicoId: string): Topico | null {
    return MateriasFeature.toggleTopico(materiaId, topicoId);
  }

  /**
   * Gestão e Geração de Cronogramas
   */
  public static obterCronogramas(): Cronograma[] {
    return CronogramaFeature.listarTodos();
  }

  public static obterCronogramaAtivo(): Cronograma | null {
    return CronogramaFeature.obterAtivo();
  }

  public static criarCronogramaManual(params: { nome: string; dias?: string[]; slotsPorDia?: number; materias?: Materia[] }) {
    return CronogramaFeature.criarManual(params);
  }

  public static gerarCronogramaAutomatico(params: { nome?: string; dias?: string[]; horasPorDia?: number; materias?: Materia[] } = {}) {
    return CronogramaFeature.gerarAutomatico(params);
  }

  public static alternarSlot(slotKey: string): boolean {
    return CronogramaFeature.alternarSlot(slotKey);
  }

  /**
   * Parser e Verticalizador de Edital
   */
  public static parseEdital(linhas: string[]) {
    return EditalFeature.parse(linhas);
  }

  /**
   * Horas de Estudo e Métricas
   */
  public static registrarHorasEstudo(params: { materiaId: string; materiaNome: string; topicoId?: string | null; topicoNome?: string; minutos?: number; origem?: 'manual' | 'timer' | 'pomodoro' | 'auto' }): StudyLogEntry | null {
    return HorasEstudoFeature.registrar(params);
  }

  public static obterMetricasEstudo() {
    return HorasEstudoFeature.obterMetricas();
  }

  /**
   * Backup e Restauração
   */
  public static exportarBackup(): BackupPayload {
    return DataRepository.exportarPayloadCompleto();
  }

  public static restaurarBackup(payload: BackupPayload): boolean {
    return DataRepository.restaurarPayload(payload);
  }

  /**
   * Biblioteca Virtual IndexedDB
   */
  public static async salvarDocumentoPdf(id: string, name: string, buffer: ArrayBuffer, totalPages: number = 1): Promise<boolean> {
    return BibliotecaFeature.salvarDocumento(id, name, buffer, totalPages);
  }

  public static async obterDocumentoPdf(id: string) {
    return BibliotecaFeature.obterDocumento(id);
  }

  public static async listarDocumentosPdf() {
    return BibliotecaFeature.listarTodos();
  }

  /**
   * Notificações e Modais
   */
  public static notificar(mensagem: string, tipo: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    ToastUI.show(mensagem, tipo);
  }

  public static abrirModal(modalId: string | HTMLElement): void {
    ModalUI.open(modalId);
  }

  public static fecharModal(modalId: string | HTMLElement): void {
    ModalUI.close(modalId);
  }
}

declare global {
  interface Window {
    AppCore?: typeof AppCore;
  }
}

if (typeof window !== 'undefined') {
  window.AppCore = AppCore;
}
