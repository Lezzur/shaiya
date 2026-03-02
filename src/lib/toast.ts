/**
 * Simple toast utility for notifications
 * Can be replaced with a more sophisticated solution like sonner later
 */

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

class ToastManager {
  private toasts: Map<string, HTMLDivElement> = new Map();

  show(type: ToastType, message: string, options?: ToastOptions) {
    const id = Math.random().toString(36).substring(7);
    const toast = this.createToastElement(type, message, options);

    document.body.appendChild(toast);
    this.toasts.set(id, toast);

    const duration = options?.duration || 3000;
    setTimeout(() => {
      this.remove(id);
    }, duration);

    return id;
  }

  private createToastElement(type: ToastType, message: string, options?: ToastOptions): HTMLDivElement {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';

    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md animate-in slide-in-from-right`;

    if (options?.title) {
      toast.innerHTML = `
        <div class="font-semibold mb-1">${options.title}</div>
        <div class="text-sm">${message}</div>
      `;
    } else {
      toast.textContent = message;
    }

    return toast;
  }

  private remove(id: string) {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-right');
      setTimeout(() => {
        toast.remove();
        this.toasts.delete(id);
      }, 300);
    }
  }

  success(message: string, options?: ToastOptions) {
    return this.show('success', message, options);
  }

  error(message: string, options?: ToastOptions) {
    return this.show('error', message, options);
  }

  info(message: string, options?: ToastOptions) {
    return this.show('info', message, options);
  }
}

export const toast = new ToastManager();
