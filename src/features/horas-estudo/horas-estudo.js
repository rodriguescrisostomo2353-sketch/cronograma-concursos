/**
 * Feature: Horas de Estudo e Métricas
 * Registra sessões de estudo, calcula estatísticas e distribuições.
 */

import { DataRepository } from '../../data/repository.js';
import { getLocalDateString } from '../../core/date-utils.js';
import { eventBus } from '../../core/events.js';

export class HorasEstudoFeature {
  static registrar({ materiaId, materiaNome, topicoId = null, topicoNome = '', minutos = 30, origem = 'manual' }) {
    if (!minutos || minutos <= 0) {
      throw new Error('A duração em minutos deve ser maior que zero.');
    }
    const log = DataRepository.registrarEstudo({
      materiaId,
      materiaNome,
      topicoId,
      topicoNome,
      minutos,
      origem,
      data: getLocalDateString()
    });
    eventBus.emit('horas:registradas', log);
    return log;
  }

  static listarRegistros() {
    return DataRepository.obterRegistrosEstudo();
  }

  static obterMetricas() {
    const logs = this.listarRegistros();
    const hojeStr = getLocalDateString();

    let totalMinutos = 0;
    let minutosHoje = 0;
    let sessoesHoje = 0;
    const porMateria = {};

    for (const log of logs) {
      const min = Number(log.minutos) || 0;
      totalMinutos += min;

      if (log.data === hojeStr) {
        minutosHoje += min;
        sessoesHoje++;
      }

      const matName = log.materiaNome || 'Outros';
      porMateria[matName] = (porMateria[matName] || 0) + min;
    }

    return {
      totalMinutos,
      totalHoras: (totalMinutos / 60).toFixed(1),
      minutosHoje,
      horasHoje: (minutosHoje / 60).toFixed(1),
      sessoesHoje,
      totalSessoes: logs.length,
      distribuicaoPorMateria: porMateria
    };
  }
}

if (typeof window !== 'undefined') {
  window.HorasEstudoFeature = HorasEstudoFeature;
}
