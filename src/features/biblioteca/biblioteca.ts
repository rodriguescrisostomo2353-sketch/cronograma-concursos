/**
 * Feature: Biblioteca Virtual de Arquivos e Leitor de PDF em TypeScript
 * Gerencia o armazenamento persistente em IndexedDB de documentos e metadados.
 */

import { eventBus } from '../../core/events';
import { PdfFileMetadata } from '../../types/index';

export class BibliotecaFeature {
  public static getStorage(): any {
    if (typeof window !== 'undefined' && (window as any).PdfStorage) {
      return (window as any).PdfStorage;
    }
    return null;
  }

  public static async salvarDocumento(id: string, name: string, arrayBuffer: ArrayBuffer, totalPages: number = 1): Promise<boolean> {
    const storage = this.getStorage();
    if (!storage) throw new Error('Armazenamento IndexedDB não inicializado.');
    const result = await storage.savePdf(id, name, arrayBuffer, totalPages);
    eventBus.emit('biblioteca:documentoSalvo', { id, name, totalPages });
    return result;
  }

  public static async obterDocumento(id: string): Promise<any> {
    const storage = this.getStorage();
    if (!storage) return null;
    return await storage.getPdf(id);
  }

  public static async excluirDocumento(id: string): Promise<boolean> {
    const storage = this.getStorage();
    if (!storage) return false;
    const result = await storage.deletePdf(id);
    eventBus.emit('biblioteca:documentoExcluido', id);
    return result;
  }

  public static async listarTodos(): Promise<PdfFileMetadata[]> {
    const storage = this.getStorage();
    if (!storage) return [];
    return await storage.getAllPdfs();
  }

  public static async buscar(termo: string = ''): Promise<PdfFileMetadata[]> {
    const todos = await this.listarTodos();
    if (!termo || !termo.trim()) return todos;
    const t = termo.toLowerCase().trim();
    return todos.filter(item => {
      const nome = String(item.name || '').toLowerCase();
      const tags = Array.isArray((item as any).tags) ? (item as any).tags.join(' ').toLowerCase() : '';
      return nome.includes(t) || tags.includes(t);
    });
  }
}

declare global {
  interface Window {
    BibliotecaFeature?: typeof BibliotecaFeature;
    PdfStorage?: any;
  }
}

if (typeof window !== 'undefined') {
  window.BibliotecaFeature = BibliotecaFeature;
}
