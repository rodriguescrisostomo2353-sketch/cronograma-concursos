/**
 * Ponto de Entrada Central dos Módulos do Front-End em TypeScript (Main Bootstrap)
 * Coordena os módulos desacoplados, a camada de dados e os ouvintes de eventos.
 */

import { eventBus } from './core/events';
import { getLocalDateString, formatDateBR, formatMinutesHuman } from './core/date-utils';
import { ErrorBoundary } from './core/error-boundary';
import { DataRepository } from './data/repository';
import { syncQueue } from './sync/sync-queue';
import { MateriasFeature } from './features/materias/materias';
import { EditalFeature } from './features/edital/edital';
import { CronogramaFeature } from './features/cronograma/cronograma';
import { HorasEstudoFeature } from './features/horas-estudo/horas-estudo';
import { BibliotecaFeature } from './features/biblioteca/biblioteca';
import { AuthFeature } from './features/auth/auth';
import { AppCore } from './app';
import { ToastUI } from './ui/toast';
import { ModalUI } from './ui/modal';

export const AppModules = {
  AppCore,
  eventBus,
  dateUtils: { getLocalDateString, formatDateBR, formatMinutesHuman },

  ErrorBoundary,
  DataRepository,
  syncQueue,
  features: {
    materias: MateriasFeature,
    edital: EditalFeature,
    cronograma: CronogramaFeature,
    horasEstudo: HorasEstudoFeature,
    biblioteca: BibliotecaFeature,
    auth: AuthFeature
  },
  ui: {
    toast: ToastUI,
    modal: ModalUI
  }
};

declare global {
  interface Window {
    AppModules?: typeof AppModules;
  }
}

// Disponibiliza no escopo global para compatibilidade transparente
if (typeof window !== 'undefined') {
  window.AppModules = AppModules;
}

// Inicialização segura dos módulos com ErrorBoundary
ErrorBoundary.safeRun('Bootstrap', () => {
  DataRepository.executarMigracoes();
  console.log('[AppModules] Front-end modular em TypeScript inicializado com sucesso.');
});
