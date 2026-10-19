/**
 * Error Boundary e Inicialização Segura de Módulos em TypeScript
 * Garante que a falha de um módulo não derrube o restante da aplicação
 */

export interface ErrorRecord {
  timestamp: string;
  module: string;
  message: string;
  stack: string | null;
  details: Record<string, unknown>;
}

export class ErrorBoundary {
  static errors: ErrorRecord[] = [];

  static captureError(moduleName: string, error: unknown, details: Record<string, unknown> = {}): void {
    const errObj = error instanceof Error ? error : new Error(String(error));
    const errorRecord: ErrorRecord = {
      timestamp: new Date().toISOString(),
      module: moduleName,
      message: errObj.message,
      stack: errObj.stack || null,
      details
    };
    this.errors.push(errorRecord);
    console.error(`[ErrorBoundary:${moduleName}]`, error, details);

    if (typeof window !== 'undefined' && (window as any).AppEvents) {
      (window as any).AppEvents.emit('module:error', errorRecord);
    }
  }

  static safeRun<T>(moduleName: string, fn: () => T, fallback: ((err: unknown) => T) | null = null): T | null {
    try {
      return fn();
    } catch (err) {
      this.captureError(moduleName, err);
      if (typeof fallback === 'function') {
        try {
          return fallback(err);
        } catch (fbErr) {
          console.error(`[ErrorBoundary:${moduleName}:Fallback]`, fbErr);
        }
      }
      return null;
    }
  }

  static async safeRunAsync<T>(
    moduleName: string,
    asyncFn: () => Promise<T>,
    fallback: ((err: unknown) => Promise<T> | T) | null = null
  ): Promise<T | null> {
    try {
      return await asyncFn();
    } catch (err) {
      this.captureError(moduleName, err);
      if (typeof fallback === 'function') {
        try {
          return await fallback(err);
        } catch (fbErr) {
          console.error(`[ErrorBoundary:${moduleName}:FallbackAsync]`, fbErr);
        }
      }
      return null;
    }
  }
}

declare global {
  interface Window {
    ErrorBoundary?: typeof ErrorBoundary;
  }
}

if (typeof window !== 'undefined') {
  window.ErrorBoundary = ErrorBoundary;
}
