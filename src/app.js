/**
 * Orquestrador Central da Aplicação em TypeScript (App Core)
 * Consolida a lógica funcional do site que residia dentro do HTML.
 */
import { DataRepository } from './data/repository';
import { eventBus } from './core/events';
import { ErrorBoundary } from './core/error-boundary';
import { MateriasFeature } from './features/materias/materias';
import { CronogramaFeature } from './features/cronograma/cronograma';
import { EditalFeature } from './features/edital/edital';
import { HorasEstudoFeature } from './features/horas-estudo/horas-estudo';
import { BibliotecaFeature } from './features/biblioteca/biblioteca';
import { ToastUI } from './ui/toast';
import { ModalUI } from './ui/modal';
export class AppCore {
    static version = '1.8.0';
    /**
     * Inicialização central do aplicativo
     */
    static init() {
        ErrorBoundary.safeRun('AppCore:init', () => {
            DataRepository.executarMigracoes();
            this.aplicarTemaSalvo();
            console.log(`[AppCore] Cronograma de Estudos v${this.version} inicializado em TypeScript.`);
        });
    }
    /**
     * Gerenciamento de Temas (Claro / Escuro)
     */
    static aplicarTemaSalvo() {
        if (typeof localStorage === 'undefined' || typeof document === 'undefined')
            return;
        const salvo = localStorage.getItem('concurso_theme') || 'light';
        this.definirTema(salvo);
    }
    static definirTema(tema) {
        if (typeof document === 'undefined')
            return;
        const t = tema === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('concurso_theme', t);
        eventBus.emit('theme:changed', t);
    }
    static alternarTema() {
        const atual = localStorage.getItem('concurso_theme') || 'light';
        const novo = atual === 'dark' ? 'light' : 'dark';
        this.definirTema(novo);
        return novo;
    }
    /**
     * Gestão de Matérias e Tópicos
     */
    static obterMaterias() {
        return MateriasFeature.listar();
    }
    static salvarMaterias(materias) {
        return DataRepository.salvarMaterias(materias);
    }
    static alternarTopico(materiaId, topicoId) {
        return MateriasFeature.toggleTopico(materiaId, topicoId);
    }
    /**
     * Gestão e Geração de Cronogramas
     */
    static obterCronogramas() {
        return CronogramaFeature.listarTodos();
    }
    static obterCronogramaAtivo() {
        return CronogramaFeature.obterAtivo();
    }
    static criarCronogramaManual(params) {
        return CronogramaFeature.criarManual(params);
    }
    static gerarCronogramaAutomatico(params = {}) {
        return CronogramaFeature.gerarAutomatico(params);
    }
    static alternarSlot(slotKey) {
        return CronogramaFeature.alternarSlot(slotKey);
    }
    /**
     * Parser e Verticalizador de Edital
     */
    static parseEdital(linhas) {
        return EditalFeature.parse(linhas);
    }
    /**
     * Horas de Estudo e Métricas
     */
    static registrarHorasEstudo(params) {
        return HorasEstudoFeature.registrar(params);
    }
    static obterMetricasEstudo() {
        return HorasEstudoFeature.obterMetricas();
    }
    /**
     * Backup e Restauração
     */
    static exportarBackup() {
        return DataRepository.exportarPayloadCompleto();
    }
    static restaurarBackup(payload) {
        return DataRepository.restaurarPayload(payload);
    }
    /**
     * Biblioteca Virtual IndexedDB
     */
    static async salvarDocumentoPdf(id, name, buffer, totalPages = 1) {
        return BibliotecaFeature.salvarDocumento(id, name, buffer, totalPages);
    }
    static async obterDocumentoPdf(id) {
        return BibliotecaFeature.obterDocumento(id);
    }
    static async listarDocumentosPdf() {
        return BibliotecaFeature.listarTodos();
    }
    /**
     * Notificações e Modais
     */
    static notificar(mensagem, tipo = 'info') {
        ToastUI.show(mensagem, tipo);
    }
    static abrirModal(modalId) {
        ModalUI.open(modalId);
    }
    static fecharModal(modalId) {
        ModalUI.close(modalId);
    }
}
if (typeof window !== 'undefined') {
    window.AppCore = AppCore;
}
//# sourceMappingURL=app.js.map