import type { Refueling } from '../types';
import {
  formatCurrency,
  formatDate,
  formatKm,
  formatLiters,
} from '../utils/format';

/**
 * <refueling-table> — Tabela do histórico de abastecimentos, ordenada por
 * data (decrescente). Cada linha possui ações de editar e excluir.
 *
 * Emite: `refueling-edit` (detail: id) e `refueling-delete` (detail: id).
 * Também emite `refueling-add` quando o botão de adicionar é acionado.
 */
export class RefuelingTable extends HTMLElement {
  private _items: Refueling[] = [];

  set items(value: Refueling[]) {
    // Garante ordenação por data desc (e por hodômetro como desempate).
    this._items = [...value].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.odometer ?? 0) - (a.odometer ?? 0);
    });
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    this.innerHTML = `
      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
          <div>
            <h3 class="text-base font-bold text-slate-900">Histórico de abastecimentos</h3>
            <p class="text-sm text-slate-500">${
              this._items.length
            } registro(s)</p>
          </div>
          <button id="add-refueling" type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span class="hidden sm:inline">Novo</span>
          </button>
        </div>
        ${this._items.length === 0 ? this.emptyState() : this.table()}
      </section>
    `;

    this.querySelector('#add-refueling')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('refueling-add', { bubbles: true, composed: true })
      );
    });

    this.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('refueling-edit', {
            detail: btn.dataset.edit,
            bubbles: true,
            composed: true,
          })
        );
      });
    });

    this.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('refueling-delete', {
            detail: btn.dataset.delete,
            bubbles: true,
            composed: true,
          })
        );
      });
    });
  }

  private emptyState(): string {
    return `
      <div class="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <span class="text-4xl">📋</span>
        <p class="font-medium text-slate-700">Nenhum abastecimento registrado</p>
        <p class="max-w-xs text-sm text-slate-500">Adicione seu primeiro abastecimento para começar a acompanhar a autonomia do seu veículo.</p>
      </div>
    `;
  }

  private table(): string {
    const rows = this._items.map((r) => this.row(r)).join('');
    return `
      <!-- Tabela (telas médias e maiores) -->
      <div class="hidden overflow-x-auto sm:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-5 py-3 font-semibold">Data</th>
              <th class="px-5 py-3 font-semibold text-right">Litros</th>
              <th class="px-5 py-3 font-semibold text-right">Hodômetro</th>
              <th class="px-5 py-3 font-semibold text-right">Preço/L</th>
              <th class="px-5 py-3 font-semibold text-center">Tanque</th>
              <th class="px-5 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${rows}
          </tbody>
        </table>
      </div>

      <!-- Cartões (telas pequenas) -->
      <div class="divide-y divide-slate-100 sm:hidden">
        ${this._items.map((r) => this.card(r)).join('')}
      </div>
    `;
  }

  private row(r: Refueling): string {
    return `
      <tr class="transition hover:bg-slate-50">
        <td class="px-5 py-3 font-medium text-slate-800">${formatDate(
          r.date
        )}</td>
        <td class="px-5 py-3 text-right text-slate-700">${formatLiters(
          r.liters
        )}</td>
        <td class="px-5 py-3 text-right text-slate-700">${this.odometerText(
          r
        )}</td>
        <td class="px-5 py-3 text-right text-slate-700">${
          r.pricePerLiter != null ? formatCurrency(r.pricePerLiter) : '—'
        }</td>
        <td class="px-5 py-3 text-center">${this.tankBadge(r.fullTank)}</td>
        <td class="px-5 py-3">
          <div class="flex justify-end gap-1">
            ${this.actionButtons(r.id)}
          </div>
        </td>
      </tr>
    `;
  }

  private card(r: Refueling): string {
    return `
      <div class="flex items-start justify-between gap-3 p-4">
        <div class="space-y-1">
          <p class="font-semibold text-slate-800">${formatDate(r.date)}</p>
          <p class="text-sm text-slate-600">${formatLiters(
            r.liters
          )} · ${this.odometerText(r)}</p>
          <p class="text-sm text-slate-500">${
            r.pricePerLiter != null
              ? `${formatCurrency(r.pricePerLiter)}/L`
              : 'Preço não informado'
          }</p>
          <div>${this.tankBadge(r.fullTank)}</div>
        </div>
        <div class="flex shrink-0 gap-1">
          ${this.actionButtons(r.id)}
        </div>
      </div>
    `;
  }

  /** Hodômetro formatado, ou "—" para abastecimentos parciais (sem registro). */
  private odometerText(r: Refueling): string {
    return r.odometer != null ? formatKm(r.odometer) : '—';
  }

  private tankBadge(full: boolean): string {
    return full
      ? `<span class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">Cheio</span>`
      : `<span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Parcial</span>`;
  }

  private actionButtons(id: string): string {
    return `
      <button type="button" data-edit="${id}" aria-label="Editar"
        class="rounded-lg p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
        </svg>
      </button>
      <button type="button" data-delete="${id}" aria-label="Excluir"
        class="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
    `;
  }
}

customElements.define('refueling-table', RefuelingTable);
