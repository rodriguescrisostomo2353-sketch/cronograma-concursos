/**
 * Feature: Gestão de Matérias e Tópicos em TypeScript
 * Fornece operações de negócio para criação, edição, exclusão e conclusão de tópicos.
 */

import { DataRepository } from '../../data/repository';
import { eventBus } from '../../core/events';
import { Materia, Topico } from '../../types/index';

export class MateriasFeature {
  public static listar(): Materia[] {
    return DataRepository.obterMaterias();
  }

  public static obterPorId(id: string): Materia | null {
    const materias = this.listar();
    return materias.find(m => m.id === id) || null;
  }

  public static adicionar(nome: string, topicosIniciais: any[] = []): Materia {
    const nomeLimpo = String(nome || '').trim();
    if (!nomeLimpo) {
      throw new Error('O nome da matéria é obrigatório.');
    }
    const materias = this.listar();
    const novaMateria = DataRepository.normalizarMateria({
      id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: nomeLimpo,
      topicos: topicosIniciais
    });
    if (!novaMateria) {
      throw new Error('Falha ao instanciar nova matéria.');
    }
    materias.push(novaMateria);
    DataRepository.salvarMaterias(materias);
    eventBus.emit('materia:adicionada', novaMateria);
    return novaMateria;
  }

  public static atualizar(id: string, dadosAtualizados: Partial<Materia>): Materia {
    const materias = this.listar();
    const index = materias.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error('Matéria não encontrada.');
    }
    const atual = materias[index];
    const materiaAtualizada = DataRepository.normalizarMateria({
      ...atual,
      ...dadosAtualizados,
      id: atual.id
    });
    if (!materiaAtualizada) {
      throw new Error('Falha ao atualizar matéria.');
    }
    materias[index] = materiaAtualizada;
    DataRepository.salvarMaterias(materias);
    eventBus.emit('materia:atualizada', materiaAtualizada);
    return materiaAtualizada;
  }

  public static excluir(id: string): boolean {
    const materias = this.listar();
    const filtradas = materias.filter(m => m.id !== id);
    if (filtradas.length === materias.length) return false;
    DataRepository.salvarMaterias(filtradas);
    eventBus.emit('materia:excluida', id);
    return true;
  }

  public static toggleTopico(materiaId: string, topicoId: string): Topico | null {
    const materias = this.listar();
    const materia = materias.find(m => m.id === materiaId);
    if (!materia) return null;

    if (!Array.isArray(materia.topicos)) {
      materia.topicos = [];
    }

    materia.topicos = DataRepository.normalizarTopicos(materia.topicos);

    const topico = materia.topicos.find(t => t.id === topicoId);
    if (!topico) return null;

    topico.concluido = !topico.concluido;
    DataRepository.salvarMaterias(materias);
    eventBus.emit('topico:statusAlterado', { materiaId, topicoId, concluido: topico.concluido });
    return topico;
  }
}

declare global {
  interface Window {
    MateriasFeature?: typeof MateriasFeature;
  }
}

if (typeof window !== 'undefined') {
  window.MateriasFeature = MateriasFeature;
}
