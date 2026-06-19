type ToastType = 'success' | 'error' | 'info';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-brand-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-slate-800 text-white',
};

function ensureContainer(): HTMLElement {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className =
      'fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none';
    document.body.appendChild(container);
  }
  return container;
}

/** Exibe uma notificação temporária (toast) para feedback ao usuário. */
export function showToast(
  message: string,
  type: ToastType = 'info',
  durationMs = 3500
): void {
  const container = ensureContainer();

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium max-w-md w-full sm:w-auto transition-all duration-300 translate-y-[-12px] opacity-0 ${STYLES[type]}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon = document.createElement('span');
  icon.className = 'text-lg leading-none';
  icon.textContent = ICONS[type];

  const text = document.createElement('span');
  text.textContent = message;

  toast.append(icon, text);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-[-12px]', 'opacity-0');
  });

  const remove = () => {
    toast.classList.add('opacity-0', 'translate-y-[-12px]');
    setTimeout(() => toast.remove(), 300);
  };

  setTimeout(remove, durationMs);
  toast.addEventListener('click', remove);
}
