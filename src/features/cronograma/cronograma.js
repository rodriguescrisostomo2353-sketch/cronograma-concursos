/**
 * Feature: Gerador e Gerenciador de Cronogramas de Estudo
 * Suporta modo automático por ciclo e modo manual semanal.
 */

import { DataRepository } from '../../data/repository.js';
import { eventBus } from '../../core/events.js';

export class CronogramaFeature {
  static listarTodos() {
    return DataRepository.obterCronogramas();
  }

  static obterAtivo() {
    return DataRepository.obterCronogramaAtivo();
  }

  static criarManual({ nome, dias = ['Segunda', 'Quarta', 'Sexta'], slotsPorDia = 2, materias = [] }) {
    if (!nome) throw new Error('O nome do cronograma é obrigatório.');

    const cronogramaId = `sched-${Date.now()}`;
    const columns = dias.map(dia => {
      const slots = [];
      for (let i = 0; i < slotsPorDia; i++) {
        const mat = materias[i % (materias.length || 1)] || null;
        slots.push({
          slotId: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          slotKey: `${dia}-bloco-${cronogramaId}-${i}`,
          slotNumber: i + 1,
          subjectId: mat ? mat.id : null,
          subjectName: mat ? mat.nome : 'Livre',
          paletteId: mat ? mat.paletteId || 'blue' : 'gray',
          durationMinutes: 60
        });
      }
      return { dia, slots };
    });

    const novoCronograma = {
      id: cronogramaId,
      name: nome,
      type: 'manual',
      dias,
      hoursPerDay: slotsPorDia,
      blockDuration: 60,
      columns,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    const lista = this.listarTodos();
    lista.push(novoCronograma);
    DataRepository.salvarCronogramas(lista, novoCronograma.id);
    eventBus.emit('cronograma:criado', novoCronograma);
    return novoCronograma;
  }

  static gerarAutomatico({ nome = 'Cronograma Automático', dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'], horasPorDia = 2, materias = [] }) {
    const cronogramaId = `sched-${Date.now()}`;
    const slotsPorDia = Math.max(1, Math.floor(horasPorDia));

    let subjectIndex = 0;
    const columns = dias.map(dia => {
      const slots = [];
      for (let i = 0; i < slotsPorDia; i++) {
        const mat = materias.length > 0 ? materias[subjectIndex % materias.length] : null;
        subjectIndex++;
        slots.push({
          slotId: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          slotKey: `${dia}-bloco-${cronogramaId}-${i}`,
          slotNumber: i + 1,
          subjectId: mat ? mat.id : null,
          subjectName: mat ? mat.nome : 'Estudo Livre',
          paletteId: mat ? (mat.paletteId || 'blue') : 'blue',
          durationMinutes: 60
        });
      }
      return { dia, slots };
    });

    const novoCronograma = {
      id: cronogramaId,
      name: nome,
      type: 'auto',
      dias,
      hoursPerDay: horasPorDia,
      blockDuration: 60,
      columns,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    const lista = this.listarTodos();
    lista.push(novoCronograma);
    DataRepository.salvarCronogramas(lista, novoCronograma.id);
    eventBus.emit('cronograma:gerado', novoCronograma);
    return novoCronograma;
  }

  static alternarSlot(slotKey) {
    return DataRepository.alternarSlotConcluido(slotKey);
  }
}

if (typeof window !== 'undefined') {
  window.CronogramaFeature = CronogramaFeature;
}
