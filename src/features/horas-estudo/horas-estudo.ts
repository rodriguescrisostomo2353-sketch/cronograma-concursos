/**
 * Feature: Horas de Estudo e Métricas em TypeScript
 * Registra sessões de estudo, calcula estatísticas e distribuições.
 */

import { DataRepository } from '../../data/repository';
import { getLocalDateString } from '../../core/date-utils';
import { eventBus } from '../../core/events';
import { StudyLogEntry } from '../../types/index';

export interface RegistrarEstudoParams {
  materiaId: string;
  materiaNome: string;
  topicoId?: string | null;
  topicoNome?: string;
  minutos?: number;
  origem?: 'manual' | 'timer' | 'pomodoro' | 'auto';
}

export interface MetricasEstudo {
  totalMinutos: number;
  totalHoras: string;
  minutosHoje: number;
  horasHoje: string;
  sessoesHoje: number;
  totalSessoes: number;
  distribuicaoPorMateria: Record<string, number>;
}

export class HorasEstudoFeature {
  public static registrar({
    materiaId,
    materiaNome,
    topicoId = null,
    topicoNome = '',
    minutos = 30,
    origem = 'manual'
  }: RegistrarEstudoParams): StudyLogEntry | null {
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

  public static listarRegistros(): StudyLogEntry[] {
    return DataRepository.obterRegistrosEstudo();
  }

  public static obterMetricas(): MetricasEstudo {
    const logs = this.listarRegistros();
    const hojeStr = getLocalDateString();

    let totalMinutos = 0;
    let minutosHoje = 0;
    let sessoesHoje = 0;
    const porMateria: Record<string, number> = {};

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

declare global {
  interface Window {
    HorasEstudoFeature?: typeof HorasEstudoFeature;
  }
}

if (typeof window !== 'undefined') {
  window.HorasEstudoFeature = HorasEstudoFeature;
}
