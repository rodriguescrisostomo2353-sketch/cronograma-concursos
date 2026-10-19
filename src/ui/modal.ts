/**
 * Componente UI: Gerenciador de Modais e Bottom Sheets em TypeScript
 * Fornece fechamento via ESC, clique fora e controle acessível de foco.
 */

export class ModalUI {
  public static open(modalId: string | HTMLElement): void {
    const el = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (!el) return;

    el.classList.add('active');
    el.setAttribute('aria-hidden', 'false');

    const focusable = el.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      setTimeout(() => focusable.focus(), 50);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close(el);
      }
    };
    (el as any)._escHandler = onKeyDown;
    document.addEventListener('keydown', onKeyDown);
  }

  public static close(modalId: string | HTMLElement): void {
    const el = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (!el) return;

    el.classList.remove('active');
    el.setAttribute('aria-hidden', 'true');

    if ((el as any)._escHandler) {
      document.removeEventListener('keydown', (el as any)._escHandler);
      delete (el as any)._escHandler;
    }
  }

  public static setupBackdropDismiss(modalId: string | HTMLElement): void {
    const el = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (!el) return;

    el.addEventListener('click', (e: MouseEvent) => {
      if (e.target === el) {
        this.close(el);
      }
    });
  }
}

declare global {
  interface Window {
    ModalUI?: typeof ModalUI;
  }
}

if (typeof window !== 'undefined') {
  window.ModalUI = ModalUI;
}
