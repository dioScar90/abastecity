import { FUEL_TYPE_LABELS, type Vehicle } from '../types';
import type { EfficiencySummary } from '../utils/efficiency';
import { formatKmPerLiter } from '../utils/format';

/**
 * <vehicle-card> — Exibe as informações do veículo de forma destacada,
 * junto com um resumo da autonomia média. Emite `vehicle-edit` ao clicar
 * em "Editar".
 */
export class VehicleCard extends HTMLElement {
  private _vehicle: Vehicle | null = null;
  private _summary: EfficiencySummary | null = null;

  set vehicle(value: Vehicle | null) {
    this._vehicle = value;
    this.render();
  }

  set summary(value: EfficiencySummary | null) {
    this._summary = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const v = this._vehicle;
    if (!v) {
      this.innerHTML = '';
      return;
    }

    const avg = this._summary
      ? formatKmPerLiter(this._summary.averageKmPerLiter)
      : '—';

    this.innerHTML = `
      <section class="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 text-white shadow-md">
        <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="flex items-center gap-4">
            <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl">🚗</span>
            <div>
              <h2 class="text-xl font-bold leading-tight">${this.escape(
                v.make
              )} ${this.escape(v.model)}</h2>
              <p class="mt-0.5 text-sm text-brand-100">
                ${v.year} · ${FUEL_TYPE_LABELS[v.fuelType]} · Tanque ${
      v.tankCapacity
    } L${v.plate ? ` · ${this.escape(v.plate)}` : ''}
              </p>
            </div>
          </div>
          <div class="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
            <div class="text-right">
              <p class="text-xs font-medium uppercase tracking-wide text-brand-200">Autonomia média</p>
              <p class="text-2xl font-extrabold leading-none">${avg}</p>
            </div>
            <div class="flex gap-2">
              <button id="edit-vehicle" type="button"
                class="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20">
                Editar
              </button>
              <button id="delete-vehicle" type="button"
                class="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500/80">
                Excluir
              </button>
            </div>
          </div>
        </div>
      </section>
    `;

    this.querySelector('#edit-vehicle')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('vehicle-edit', { bubbles: true, composed: true })
      );
    });

    this.querySelector('#delete-vehicle')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('vehicle-delete', { bubbles: true, composed: true })
      );
    });
  }

  private escape(value: string): string {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }
}

customElements.define('vehicle-card', VehicleCard);
