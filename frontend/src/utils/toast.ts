/**
 * Sistema ligero de notificaciones Toast para la UI de ERP-IDI.
 * Funciona de manera reactiva y no intrusiva en cliente, compatible con React 19.
 * Posicionado en la esquina inferior derecha con acabado translúcido tipo Liquid Glass.
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

  // Buscar o crear el contenedor global de toasts en la esquina inferior derecha
  let container = document.getElementById('idi-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'idi-toast-container';
    container.className =
      'fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0';
    document.body.appendChild(container);
  }

  // Crear elemento de notificación con estilo Liquid Glass
  const toastEl = document.createElement('div');
  const bgClasses =
    type === 'success'
      ? 'bg-emerald-600/95 dark:bg-emerald-700/95 text-white border-emerald-400/40 shadow-emerald-950/20'
      : type === 'error'
        ? 'bg-rose-600/95 dark:bg-rose-700/95 text-white border-rose-400/40 shadow-rose-950/20'
        : 'bg-slate-900/95 dark:bg-slate-800/95 text-white border-slate-700/60 shadow-slate-950/20';

  toastEl.className = `flex items-center justify-between p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-xs sm:text-sm font-medium transition-all duration-300 transform translate-y-3 opacity-0 pointer-events-auto ring-1 ring-black/10 ${bgClasses}`;

  // Contenedor de icono y texto alineados
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'flex items-center gap-2.5 flex-1 min-w-0';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'flex items-center justify-center w-5 h-5 rounded-full bg-white/20 shrink-0 text-xs font-bold';
  iconSpan.innerHTML = type === 'success' ? '&#10003;' : type === 'error' ? '&#9888;' : '&#8505;';
  contentWrapper.appendChild(iconSpan);

  const textSpan = document.createElement('span');
  textSpan.className = 'leading-snug break-words flex-1';
  textSpan.textContent = message;
  contentWrapper.appendChild(textSpan);

  toastEl.appendChild(contentWrapper);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.innerHTML = '&times;';
  closeBtn.className =
    'ml-2.5 text-lg leading-none font-bold opacity-75 hover:opacity-100 focus:outline-none cursor-pointer shrink-0 transition-opacity';
  closeBtn.onclick = () => {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translate-y-3';
    setTimeout(() => toastEl.remove(), 250);
  };
  toastEl.appendChild(closeBtn);

  container.appendChild(toastEl);

  // Animación suave de entrada (desde abajo)
  requestAnimationFrame(() => {
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translate-y-0';
  });

  // Auto-cierre
  setTimeout(() => {
    if (toastEl.parentElement) {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translate-y-3';
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
