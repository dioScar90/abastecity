import { FUEL_TYPE_LABELS, type FuelType, type Vehicle } from '../types';

/**
 * <vehicle-form> — Formulário de cadastro/edição do veículo (1 por usuário).
 * Emite o evento `vehicle-save` com o veículo no `detail`.
 * Emite `vehicle-cancel` quando o usuário cancela a edição.
 */
export class VehicleForm extends HTMLElement {
  private _vehicle: Vehicle | null = null;
  private _showCancel = false;

  /** Define o veículo a editar (ou null para cadastro novo). */
  set vehicle(value: Vehicle | null) {
    this._vehicle = value;
    this.render();
  }

  set showCancel(value: boolean) {
    this._showCancel = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private fuelOptions(selected?: FuelType): string {
    return (Object.keys(FUEL_TYPE_LABELS) as FuelType[])
      .map(
        (k) =>
          `<option value="${k}" ${k === selected ? 'selected' : ''}>${
            FUEL_TYPE_LABELS[k]
          }</option>`
      )
      .join('');
  }

  private render(): void {
    const v = this._vehicle;
    const isEdit = Boolean(v);
    const year = new Date().getFullYear();

    this.innerHTML = `
      <form id="vehicle-form" novalidate
        class="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div class="mb-6 text-center">
          <span class="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">🚗</span>
          <h2 class="text-xl font-bold text-slate-900">${
            isEdit ? 'Editar veículo' : 'Cadastre seu veículo'
          }</h2>
          <p class="mt-1 text-sm text-slate-500">${
            isEdit
              ? 'Atualize as informações do seu veículo.'
              : 'Você gerencia um veículo por conta. Preencha os dados abaixo.'
          }</p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-1">
            <label class="mb-1 block text-sm font-medium text-slate-700" for="make">Marca *</label>
            <input id="make" name="make" type="text" required placeholder="Ex: Volkswagen"
              value="${this.attr(v?.make)}"
              class="${this.inputClass}" />
          </div>
          <div class="sm:col-span-1">
            <label class="mb-1 block text-sm font-medium text-slate-700" for="model">Modelo *</label>
            <input id="model" name="model" type="text" required placeholder="Ex: Golf"
              value="${this.attr(v?.model)}"
              class="${this.inputClass}" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="year">Ano *</label>
            <input id="year" name="year" type="number" required min="1950" max="${
              year + 1
            }" placeholder="${year}"
              value="${v?.year ?? ''}"
              class="${this.inputClass}" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="plate">Placa</label>
            <input id="plate" name="plate" type="text" placeholder="ABC1D23" maxlength="8"
              value="${this.attr(v?.plate)}"
              class="${this.inputClass} uppercase" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="tankCapacity">Capacidade do tanque (L) *</label>
            <input id="tankCapacity" name="tankCapacity" type="number" required min="1" step="0.1" placeholder="Ex: 50"
              value="${v?.tankCapacity ?? ''}"
              class="${this.inputClass}" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="fuelType">Combustível *</label>
            <select id="fuelType" name="fuelType" class="${this.inputClass}">
              ${this.fuelOptions(v?.fuelType)}
            </select>
          </div>
        </div>

        <p id="form-error" class="mt-4 hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert"></p>

        <div class="mt-6 flex gap-3">
          ${
            this._showCancel
              ? `<button type="button" id="cancel-btn"
                  class="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50">
                  Cancelar
                </button>`
              : ''
          }
          <button type="submit"
            class="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
            ${isEdit ? 'Salvar alterações' : 'Cadastrar veículo'}
          </button>
        </div>
      </form>
    `;

    const form = this.querySelector<HTMLFormElement>('#vehicle-form')!;
    form.addEventListener('submit', this.handleSubmit);
    this.querySelector('#cancel-btn')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('vehicle-cancel', { bubbles: true, composed: true })
      );
    });
  }

  private get inputClass(): string {
    return 'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
  }

  private handleSubmit = (e: Event): void => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);

    const make = String(data.get('make') ?? '').trim();
    const model = String(data.get('model') ?? '').trim();
    const year = Number(data.get('year'));
    const tankCapacity = Number(data.get('tankCapacity'));
    const fuelType = String(data.get('fuelType')) as FuelType;
    const plate = String(data.get('plate') ?? '').trim().toUpperCase();

    const error = this.validate({ make, model, year, tankCapacity });
    if (error) {
      this.showError(error);
      return;
    }

    const vehicle: Vehicle = {
      make,
      model,
      year,
      tankCapacity,
      fuelType,
      ...(plate ? { plate } : {}),
    };

    this.dispatchEvent(
      new CustomEvent<Vehicle>('vehicle-save', {
        detail: vehicle,
        bubbles: true,
        composed: true,
      })
    );
  };

  private validate(v: {
    make: string;
    model: string;
    year: number;
    tankCapacity: number;
  }): string | null {
    const currentYear = new Date().getFullYear();
    if (!v.make) return 'Informe a marca do veículo.';
    if (!v.model) return 'Informe o modelo do veículo.';
    if (!v.year || v.year < 1950 || v.year > currentYear + 1)
      return `Informe um ano válido (1950 a ${currentYear + 1}).`;
    if (!v.tankCapacity || v.tankCapacity <= 0)
      return 'Informe uma capacidade de tanque válida.';
    return null;
  }

  private showError(message: string): void {
    const el = this.querySelector('#form-error')!;
    el.textContent = message;
    el.classList.remove('hidden');
  }

  private attr(value?: string): string {
    return (value ?? '').replace(/"/g, '&quot;');
  }
}

customElements.define('vehicle-form', VehicleForm);
