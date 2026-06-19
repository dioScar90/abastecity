import type { AuthUser } from '../types';
import { logout } from '../firebase/auth';
import { showToast } from '../utils/toast';

/**
 * <app-header> — Cabeçalho de navegação.
 * Renderiza em light DOM para herdar os estilos do Tailwind.
 */
export class AppHeader extends HTMLElement {
  private _user: AuthUser | null = null;
  private _online = true;

  set user(value: AuthUser | null) {
    this._user = value;
    this.render();
  }

  set online(value: boolean) {
    this._online = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const offlineBadge = this._online
      ? ''
      : `<span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800" title="Sem conexão — exibindo dados em cache">
           <span class="h-2 w-2 rounded-full bg-amber-500"></span> Offline
         </span>`;

    const userArea = this._user
      ? `
        <div class="flex items-center gap-3">
          ${offlineBadge}
          <div class="hidden text-right sm:block">
            <p class="text-sm font-semibold leading-tight text-slate-100">${this.escape(
              this._user.displayName ?? 'Usuário'
            )}</p>
            <p class="text-xs leading-tight text-slate-400">${this.escape(
              this._user.email ?? ''
            )}</p>
          </div>
          ${
            this._user.photoURL
              ? `<img src="${this.escape(
                  this._user.photoURL
                )}" alt="Foto do perfil" class="h-9 w-9 rounded-full ring-2 ring-brand-500/40" referrerpolicy="no-referrer" />`
              : `<div class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">${this.initials()}</div>`
          }
          <button id="logout-btn" type="button"
            class="rounded-lg p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            title="Sair" aria-label="Sair">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>`
      : offlineBadge;

    this.innerHTML = `
      <header class="sticky top-0 z-40 border-b border-slate-700/60 bg-slate-900/95 backdrop-blur">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div class="flex items-center gap-2.5">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg shadow-md">⛽</span>
            <div>
              <h1 class="text-lg font-extrabold leading-none tracking-tight text-white">Abasteci<span class="text-brand-400">ty</span></h1>
              <p class="text-[11px] font-medium leading-tight text-slate-400">Controle de combustível</p>
            </div>
          </div>
          ${userArea}
        </div>
      </header>
    `;

    this.querySelector('#logout-btn')?.addEventListener('click', async () => {
      try {
        await logout();
        showToast('Você saiu da sua conta.', 'info');
      } catch {
        showToast('Erro ao sair. Tente novamente.', 'error');
      }
    });
  }

  private initials(): string {
    const name = this._user?.displayName ?? this._user?.email ?? '?';
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  private escape(value: string): string {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }
}

customElements.define('app-header', AppHeader);
