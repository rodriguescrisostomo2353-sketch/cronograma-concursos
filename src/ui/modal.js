/**
 * Componente UI: Gerenciador de Modais e Bottom Sheets
 * Fornece fechamento via ESC, clique fora e controle acessível de foco.
 */

export class ModalUI {
  static open(modalId) {
    const el = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (!el) return;

    el.classList.add('active');
    el.setAttribute('aria-hidden', 'false');

    const focusable = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      setTimeout(() => focusable.focus(), 50);
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.close(el);
      }
    };
    el._escHandler = onKeyDown;
    document.addEventListener('keydown', onKeyDown);
  }

  static close(modalId) {
    const el = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (!el) return;

    el.classList.remove('active');
    el.setAttribute('aria-hidden', 'true');

    if (el._escHandler) {
      document.removeEventListener('keydown', el._escHandler);
      delete el._escHandler;
    }
  }

  static setupBackdropDismiss(modalId) {
    const el = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (!el) return;

    el.addEventListener('click', (e) => {
      if (e.target === el) {
        this.close(el);
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.ModalUI = ModalUI;
}
