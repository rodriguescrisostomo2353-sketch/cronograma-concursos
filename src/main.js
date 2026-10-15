/**
 * Ponto de Entrada Central dos Módulos do Front-End (Main Bootstrap)
 * Coordena os módulos desacoplados, a camada de dados e os ouvintes de eventos.
 */

import { eventBus } from './core/events.js';
import { getLocalDateString, formatDateBR, formatMinutesHuman } from './core/date-utils.js';
import { ErrorBoundary } from './core/error-boundary.js';
import { DataRepository } from './data/repository.js';
import { syncQueue } from './sync/sync-queue.js';
import { MateriasFeature } from './features/materias/materias.js';
import { EditalFeature } from './features/edital/edital.js';
import { CronogramaFeature } from './features/cronograma/cronograma.js';
import { HorasEstudoFeature } from './features/horas-estudo/horas-estudo.js';
import { BibliotecaFeature } from './features/biblioteca/biblioteca.js';
import { AuthFeature } from './features/auth/auth.js';
import { ToastUI } from './ui/toast.js';
import { ModalUI } from './ui/modal.js';

export const AppModules = {
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

// Disponibiliza no escopo global para compatibilidade transparente
if (typeof window !== 'undefined') {
  window.AppModules = AppModules;
}

// Inicialização segura dos módulos com ErrorBoundary
ErrorBoundary.safeRun('Bootstrap', () => {
  DataRepository.executarMigracoes();
  console.log('[AppModules] Front-end modular carregado e inicializado com sucesso.');
});
