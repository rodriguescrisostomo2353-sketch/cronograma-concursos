/**
 * Definições de Tipos e Contratos TypeScript do Aplicativo
 * Cronograma de Estudos para Concursos
 */

export interface Topico {
  id: string;
  texto: string;
  concluido: boolean;
  numero?: string | number | null;
  nivel?: number;
  prioridade?: 'baixa' | 'media' | 'alta';
  anotacoes?: string;
  dataConclusao?: string;
}

export interface Materia {
  id: string;
  nome: string;
  topicos: Topico[];
  cor?: string;
  peso?: number;
  questoesFeitas?: number;
  questoesAcertos?: number;
}

export interface ScheduleSlot {
  materiaId: string;
  materiaNome: string;
  duracaoMin: number;
  concluido?: boolean;
}

export interface ScheduleDay {
  dia: string;
  slots: ScheduleSlot[];
}

export interface Cronograma {
  id: string;
  nome: string;
  criadoEm: string;
  dias: string[];
  horasPorDia?: number;
  modo?: 'manual' | 'auto';
  diasSemana?: Record<string, ScheduleSlot[]>;
  slots?: ScheduleSlot[];
  ativo?: boolean;
}

export interface StudyLogEntry {
  id: string;
  data: string;
  topicoId?: string | null;
  topicoNome?: string;
  materiaId: string;
  materiaNome: string;
  minutos: number;
  criadoEm: string;
  origem: 'manual' | 'timer' | 'pomodoro' | 'auto';
  updatedAt: string;
}

export interface SpacedReview {
  id: string;
  topicoId: string;
  topicoNome: string;
  materiaId: string;
  materiaNome: string;
  dataEstudo: string;
  intervaloDias: number;
  dataRevisao: string;
  concluida: boolean;
}

export interface PdfFileMetadata {
  id: string;
  name: string;
  size?: number;
  totalPages?: number;
  lastPage?: number;
  updatedAt: number;
}

export interface BackupSummary {
  materiasCount: number;
  schedulesCount: number;
  studyLogsCount: number;
}

export interface BackupPayload {
  app: string;
  version: string;
  exportDate: string;
  exportDateFormatted: string;
  dataVersion: number;
  summary: BackupSummary;
  data: {
    materias: Materia[];
    naoClassificado: string[];
    dataVersion: number;
  };
  schedules: Cronograma[];
  activeScheduleId: string | null;
  completedSlots: Record<string, boolean>;
  spacedReviews: SpacedReview[];
  studyLog: StudyLogEntry[];
}

export interface UserCredentials {
  email: string;
  password?: string;
}

export interface AuthSession {
  token: string | null;
  user: {
    id: string;
    email: string;
  } | null;
  isAuthenticated: boolean;
}

export interface CloudSyncPayload {
  user_id?: string;
  materias: Materia[];
  nao_classificado?: string[];
  schedules: Cronograma[];
  active_schedule_id: string | null;
  completed_slots: Record<string, boolean>;
  priorities: Record<string, any>;
  auto_config?: any;
  exam_date?: string | null;
  exam_title?: string | null;
  spaced_reviews?: SpacedReview[];
  study_log?: StudyLogEntry[];
  theme?: 'light' | 'dark';
  pdf_annotations?: any[];
  pdf_bookmarks?: any[];
  device_id?: string;
  revision?: number;
  content_hash?: string;
  reset_epoch?: number;
  updated_at?: string;
}

export interface SyncCheckResult {
  hasData: boolean;
  updatedAt?: string | null;
  dataVersion: number;
  resetEpoch?: number;
  deviceId?: string | null;
  revision: number;
  contentHash?: string | null;
  serverTimeUnixMs: number;
}
