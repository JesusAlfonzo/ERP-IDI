/**
 * Sistema ligero de notificaciones Toast para la UI de ERP-IDI.
 * Funciona de manera reactiva y no intrusiva en cliente, compatible con React 19.
 * Posicionado en la esquina inferior derecha con acabado translúcido tipo Liquid Glass.
 */

export interface ToastOptions {
  duration?: number;
}

export interface RealtimeNotificationToastOptions {
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "ALERT" | "SUCCESS";
  onClick?: () => void;
  duration?: number;
}

function getOrCreateToastContainer(): HTMLElement {
  let container = document.getElementById("idi-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "idi-toast-container";
    container.className =
      "fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0";
    document.body.appendChild(container);
  }
  return container;
}

const showToast = (
  message: string,
  type: "success" | "error" | "info" = "info",
  options?: ToastOptions,
) => {
  if (typeof window === "undefined") return;

  const duration = options?.duration ?? 3500;
  const container = getOrCreateToastContainer();

  const toastEl = document.createElement("div");
  const bgClasses =
    type === "success"
      ? "bg-emerald-600/95 dark:bg-emerald-700/95 text-white border-emerald-400/40 shadow-emerald-950/20"
      : type === "error"
        ? "bg-rose-600/95 dark:bg-rose-700/95 text-white border-rose-400/40 shadow-rose-950/20"
        : "bg-slate-900/95 dark:bg-slate-800/95 text-white border-slate-700/60 shadow-slate-950/20";

  toastEl.className = `flex items-center justify-between p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-xs sm:text-sm font-medium transition-all duration-300 transform translate-y-3 opacity-0 pointer-events-auto ring-1 ring-black/10 ${bgClasses}`;

  const contentWrapper = document.createElement("div");
  contentWrapper.className = "flex items-center gap-2.5 flex-1 min-w-0";

  const iconSpan = document.createElement("span");
  iconSpan.className =
    "flex items-center justify-center w-5 h-5 rounded-full bg-white/20 shrink-0 text-xs font-bold";
  iconSpan.innerHTML =
    type === "success" ? "&#10003;" : type === "error" ? "&#9888;" : "&#8505;";
  contentWrapper.appendChild(iconSpan);

  const textSpan = document.createElement("span");
  textSpan.className = "leading-snug break-words flex-1";
  textSpan.textContent = message;
  contentWrapper.appendChild(textSpan);

  toastEl.appendChild(contentWrapper);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "&times;";
  closeBtn.className =
    "ml-2.5 text-lg leading-none font-bold opacity-75 hover:opacity-100 focus:outline-none cursor-pointer shrink-0 transition-opacity";
  closeBtn.onclick = () => {
    toastEl.style.opacity = "0";
    toastEl.style.transform = "translate-y-3";
    setTimeout(() => toastEl.remove(), 250);
  };
  toastEl.appendChild(closeBtn);

  container.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.style.opacity = "1";
    toastEl.style.transform = "translate-y-0";
  });

  setTimeout(() => {
    if (toastEl.parentElement) {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translate-y-3";
      setTimeout(() => toastEl.remove(), 250);
    }
  }, duration);
};

const showRealtimeNotificationToast = (
  opts: RealtimeNotificationToastOptions,
) => {
  if (typeof window === "undefined") return;

  const duration = opts.duration ?? 6500;
  const container = getOrCreateToastContainer();

  const accentClasses =
    opts.type === "SUCCESS"
      ? "border-emerald-500/60 bg-slate-950/95 text-white"
      : opts.type === "ALERT"
        ? "border-rose-500/60 bg-slate-950/95 text-white"
        : opts.type === "WARNING"
          ? "border-amber-500/60 bg-slate-950/95 text-white"
          : "border-blue-500/60 bg-slate-950/95 text-white";

  const badgeClasses =
    opts.type === "SUCCESS"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : opts.type === "ALERT"
        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
        : opts.type === "WARNING"
          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
          : "bg-blue-500/20 text-blue-300 border-blue-500/30";

  const toastEl = document.createElement("div");
  toastEl.className = `flex items-start justify-between gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border-l-4 border text-xs transition-all duration-300 transform translate-y-3 opacity-0 pointer-events-auto ${accentClasses} ${
    opts.onClick ? "cursor-pointer hover:bg-slate-900" : ""
  }`;

  const bodyEl = document.createElement("div");
  bodyEl.className = "flex-1 min-w-0 space-y-1";

  const topRow = document.createElement("div");
  topRow.className = "flex items-center gap-2";

  const tagSpan = document.createElement("span");
  tagSpan.className = `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClasses}`;
  tagSpan.textContent = "Nueva Alerta";
  topRow.appendChild(tagSpan);

  bodyEl.appendChild(topRow);

  const titleEl = document.createElement("p");
  titleEl.className = "font-bold text-sm text-white leading-tight pt-0.5";
  titleEl.textContent = opts.title;
  bodyEl.appendChild(titleEl);

  const msgEl = document.createElement("p");
  msgEl.className = "text-xs text-slate-300 leading-snug line-clamp-2";
  msgEl.textContent = opts.message;
  bodyEl.appendChild(msgEl);

  if (opts.onClick) {
    const actionHint = document.createElement("span");
    actionHint.className =
      "inline-block text-[11px] font-semibold text-blue-400 pt-0.5";
    actionHint.textContent = "Clic para abrir →";
    bodyEl.appendChild(actionHint);
  }

  toastEl.appendChild(bodyEl);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "&times;";
  closeBtn.className =
    "text-lg leading-none font-bold text-slate-400 hover:text-white focus:outline-none cursor-pointer shrink-0";
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    toastEl.style.opacity = "0";
    toastEl.style.transform = "translate-y-3";
    setTimeout(() => toastEl.remove(), 250);
  };
  toastEl.appendChild(closeBtn);

  if (opts.onClick) {
    toastEl.onclick = () => {
      opts.onClick?.();
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translate-y-3";
      setTimeout(() => toastEl.remove(), 200);
    };
  }

  container.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.style.opacity = "1";
    toastEl.style.transform = "translate-y-0";
  });

  setTimeout(() => {
    if (toastEl.parentElement) {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translate-y-3";
      setTimeout(() => toastEl.remove(), 250);
    }
  }, duration);
};

export const toast = {
  success: (msg: string, opts?: ToastOptions) => {
    showToast(msg, "success", opts);
  },
  error: (msg: string, opts?: ToastOptions) => {
    showToast(msg, "error", opts);
  },
  info: (msg: string, opts?: ToastOptions) => {
    showToast(msg, "info", opts);
  },
  notification: (opts: RealtimeNotificationToastOptions) => {
    showRealtimeNotificationToast(opts);
  },
};
