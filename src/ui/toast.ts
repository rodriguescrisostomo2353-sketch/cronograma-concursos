/**
 * Componente UI: Notificações Toast em TypeScript
 * Apresenta avisos temporários não bloqueantes de forma acessível e padronizada.
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export class ToastUI {
  private static container: HTMLElement | null = null;

  public static getOrCreateContainer(): HTMLElement {
    if (!this.container || !document.body.contains(this.container)) {
      this.container = document.getElementById('toastContainer');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toastContainer';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        this.container.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 10000;
          pointer-events: none;
          max-width: 90vw;
        `;
        document.body.appendChild(this.container);
      }
    }
    return this.container;
  }

  public static show(message: string, type: ToastType = 'info', duration: number = 3500): void {
    if (typeof document === 'undefined') return;
    const container = this.getOrCreateContainer();

    const toast = document.createElement('div');
    toast.className = `app-toast app-toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.style.cssText = `
      pointer-events: auto;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 500;
      color: #fff;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(12px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    `;

    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    const timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);

    toast.addEventListener('click', () => {
      clearTimeout(timer);
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    });
  }
}

declare global {
  interface Window {
    ToastUI?: typeof ToastUI;
  }
}

if (typeof window !== 'undefined') {
  window.ToastUI = ToastUI;
}
