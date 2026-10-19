/**
 * Feature: Biblioteca Virtual de Arquivos e Leitor de PDF
 * Gerencia o armazenamento persistente em IndexedDB de documentos e metadados.
 */

import { eventBus } from '../../core/events.js';

export class BibliotecaFeature {
  static getStorage() {
    if (typeof window !== 'undefined' && window.PdfStorage) {
      return window.PdfStorage;
    }
    return null;
  }

  static async salvarDocumento(id, name, arrayBuffer, totalPages = 1) {
    const storage = this.getStorage();
    if (!storage) throw new Error('Armazenamento IndexedDB não inicializado.');
    const result = await storage.savePdf(id, name, arrayBuffer, totalPages);
    eventBus.emit('biblioteca:documentoSalvo', { id, name, totalPages });
    return result;
  }

  static async obterDocumento(id) {
    const storage = this.getStorage();
    if (!storage) return null;
    return await storage.getPdf(id);
  }

  static async excluirDocumento(id) {
    const storage = this.getStorage();
    if (!storage) return false;
    const result = await storage.deletePdf(id);
    eventBus.emit('biblioteca:documentoExcluido', id);
    return result;
  }

  static async listarTodos() {
    const storage = this.getStorage();
    if (!storage) return [];
    return await storage.getAllPdfs();
  }

  static async buscar(termo = '') {
    const todos = await this.listarTodos();
    if (!termo || !termo.trim()) return todos;
    const t = termo.toLowerCase().trim();
    return todos.filter(item => {
      const nome = String(item.name || '').toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
      return nome.includes(t) || tags.includes(t);
    });
  }
}

if (typeof window !== 'undefined') {
  window.BibliotecaFeature = BibliotecaFeature;
}
