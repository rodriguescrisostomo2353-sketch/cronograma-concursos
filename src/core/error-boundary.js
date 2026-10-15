/**
 * Error Boundary e Inicialização Segura de Módulos
 * Garante que a falha de um módulo não derrube o restante da aplicação
 */

export class ErrorBoundary {
  static errors = [];

  static captureError(moduleName, error, details = {}) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      module: moduleName,
      message: error?.message || String(error),
      stack: error?.stack || null,
      details
    };
    this.errors.push(errorRecord);
    console.error(`[ErrorBoundary:${moduleName}]`, error, details);

    if (typeof window !== 'undefined' && window.AppEvents) {
      window.AppEvents.emit('module:error', errorRecord);
    }
  }

  static safeRun(moduleName, fn, fallback = null) {
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

  static async safeRunAsync(moduleName, asyncFn, fallback = null) {
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

if (typeof window !== 'undefined') {
  window.ErrorBoundary = ErrorBoundary;
}
