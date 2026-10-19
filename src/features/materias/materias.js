/**
 * Feature: Gestão de Matérias e Tópicos
 * Fornece operações de negócio para criação, edição, exclusão e conclusão de tópicos.
 */

import { DataRepository } from '../../data/repository.js';
import { eventBus } from '../../core/events.js';

export class MateriasFeature {
  static listar() {
    return DataRepository.obterMaterias();
  }

  static obterPorId(id) {
    const materias = this.listar();
    return materias.find(m => m.id === id) || null;
  }

  static adicionar(nome, topicosIniciais = []) {
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
    materias.push(novaMateria);
    DataRepository.salvarMaterias(materias);
    eventBus.emit('materia:adicionada', novaMateria);
    return novaMateria;
  }

  static atualizar(id, dadosAtualizados) {
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
    materias[index] = materiaAtualizada;
    DataRepository.salvarMaterias(materias);
    eventBus.emit('materia:atualizada', materiaAtualizada);
    return materiaAtualizada;
  }

  static excluir(id) {
    const materias = this.listar();
    const filtradas = materias.filter(m => m.id !== id);
    if (filtradas.length === materias.length) return false;
    DataRepository.salvarMaterias(filtradas);
    eventBus.emit('materia:excluida', id);
    return true;
  }

  static toggleTopico(materiaId, topicoId) {
    const materias = this.listar();
    const materia = materias.find(m => m.id === materiaId);
    if (!materia) return null;

    if (!Array.isArray(materia.topicos)) {
      materia.topicos = [];
    }

    // Normalização defensiva caso ainda existam strings
    materia.topicos = DataRepository.normalizarTopicos(materia.topicos);

    const topico = materia.topicos.find(t => t.id === topicoId);
    if (!topico) return null;

    topico.concluido = !topico.concluido;
    DataRepository.salvarMaterias(materias);
    eventBus.emit('topico:statusAlterado', { materiaId, topicoId, concluido: topico.concluido });
    return topico;
  }
}

if (typeof window !== 'undefined') {
  window.MateriasFeature = MateriasFeature;
}
