/**
 * Sistema ligero de notificaciones Toast para la UI de ERP-IDI.
 * Funciona de manera reactiva y no intrusiva en cliente, compatible con React 19.
 */

export interface ToastOptions {
  duration?: number;
}

const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
  options?: ToastOptions
) => {
  if (typeof window === 'undefined') return;

  const duration = options?.duration ?? 3500;

  // Buscar o crear el contenedor global de toasts
  let container = document.getElementById('idi-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'idi-toast-container';
    container.className =
      'fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0';
    document.body.appendChild(container);
  }

  // Crear elemento de notificación
  const toastEl = document.createElement('div');
  const bgClasses =
    type === 'success'
      ? 'bg-emerald-600 text-white'
      : type === 'error'
        ? 'bg-rose-600 text-white'
        : 'bg-slate-800 text-white';

  toastEl.className = `flex items-center justify-between p-3.5 rounded-xl shadow-xl text-xs sm:text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto ${bgClasses}`;

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toastEl.appendChild(textSpan);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.innerHTML = '&times;';
  closeBtn.className =
    'ml-3 text-lg leading-none font-bold hover:opacity-75 focus:outline-none cursor-pointer';
  closeBtn.onclick = () => {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translate-y-2';
    setTimeout(() => toastEl.remove(), 250);
  };
  toastEl.appendChild(closeBtn);

  container.appendChild(toastEl);

  // Animación de entrada
  requestAnimationFrame(() => {
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translate-y-0';
  });

  // Auto-cierre
  setTimeout(() => {
    if (toastEl.parentElement) {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translate-y-2';
      setTimeout(() => toastEl.remove(), 250);
    }
  }, duration);
};

export const toast = {
  success: (msg: string, opts?: ToastOptions) => {
    console.log(`[Toast Success]: ${msg}`);
    showToast(msg, 'success', opts);
  },
  error: (msg: string, opts?: ToastOptions) => {
    console.error(`[Toast Error]: ${msg}`);
    showToast(msg, 'error', opts);
  },
  info: (msg: string, opts?: ToastOptions) => {
    console.info(`[Toast Info]: ${msg}`);
    showToast(msg, 'info', opts);
  },
};
