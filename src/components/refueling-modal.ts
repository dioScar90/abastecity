import type { Refueling, RefuelingInput } from '../types';
import { todayISO } from '../utils/format';

/**
 * <refueling-modal> — Modal de cadastro/edição de abastecimento.
 *
 * Custom Element autônomo que encapsula um elemento nativo `<dialog>`
 * (com suporte a backdrop, ESC para fechar e foco). Use `openForCreate()`
 * ou `openForEdit(record)` para abrir. Emite `refueling-submit` com
 * `{ id?: string; input: RefuelingInput }` no `detail`.
 */
export class RefuelingModal extends HTMLElement {
  private dialog!: HTMLDialogElement;
  private editingId: string | null = null;

  connectedCallback(): void {
    this.render();
    this.dialog = this.querySelector('dialog')!;

    this.querySelector<HTMLFormElement>('#refueling-form')!.addEventListener(
      'submit',
      this.handleSubmit
    );
    this.querySelectorAll('[data-close]').forEach((btn) =>
      btn.addEventListener('click', () => this.close())
    );
    // Fecha ao clicar no backdrop (fora do conteúdo).
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });
    // O hodômetro só é exigido/habilitado quando o tanque foi completado.
    this.querySelector<HTMLInputElement>('#fullTank')!.addEventListener(
      'change',
      () => this.syncOdometerState()
    );
  }

  openForCreate(): void {
    this.editingId = null;
    this.resetForm();
    this.setTitle('Novo abastecimento', 'Registre os dados do abastecimento.');
    this.fillForm({
      date: todayISO(),
      liters: undefined,
      odometer: undefined,
      pricePerLiter: undefined,
      fullTank: true,
    });
    this.showModal();
  }

  openForEdit(record: Refueling): void {
    this.editingId = record.id;
    this.resetForm();
    this.setTitle('Editar abastecimento', 'Atualize os dados do registro.');
    this.fillForm(record);
    this.showModal();
  }

  close(): void {
    this.dialog.close();
    document.body.classList.remove('overflow-hidden');
  }

  private showModal(): void {
    this.dialog.showModal();
    document.body.classList.add('overflow-hidden');
    // Foco no primeiro campo.
    this.querySelector<HTMLInputElement>('#date')?.focus();
  }

  private setTitle(title: string, subtitle: string): void {
    this.querySelector('#modal-title')!.textContent = title;
    this.querySelector('#modal-subtitle')!.textContent = subtitle;
    this.querySelector('#submit-refueling')!.textContent = this.editingId
      ? 'Salvar alterações'
      : 'Adicionar';
  }

  private handleSubmit = (e: Event): void => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);

    const date = String(data.get('date') ?? '');
    const liters = Number(data.get('liters'));
    const odometerRaw = String(data.get('odometer') ?? '').trim();
    const odometer = odometerRaw ? Number(odometerRaw) : undefined;
    const priceRaw = String(data.get('pricePerLiter') ?? '').trim();
    const pricePerLiter = priceRaw ? Number(priceRaw) : undefined;
    const fullTank = data.get('fullTank') === 'on';

    const error = this.validate({ date, liters, odometer, fullTank, pricePerLiter });
    if (error) {
      this.showError(error);
      return;
    }

    const input: RefuelingInput = {
      date,
      liters,
      fullTank,
      // Hodômetro só é gravado nos abastecimentos com tanque cheio.
      ...(fullTank && odometer !== undefined ? { odometer } : {}),
      ...(pricePerLiter !== undefined ? { pricePerLiter } : {}),
    };

    this.dispatchEvent(
      new CustomEvent<{ id: string | null; input: RefuelingInput }>(
        'refueling-submit',
        {
          detail: { id: this.editingId, input },
          bubbles: true,
          composed: true,
        }
      )
    );
  };

  private validate(v: {
    date: string;
    liters: number;
    odometer?: number;
    fullTank: boolean;
    pricePerLiter?: number;
  }): string | null {
    if (!v.date) return 'Informe a data do abastecimento.';
    if (v.date > todayISO()) return 'A data não pode ser no futuro.';
    if (!v.liters || v.liters <= 0)
      return 'Informe a quantidade de litros (maior que zero).';
    // Hodômetro é obrigatório apenas quando o tanque foi completado.
    if (v.fullTank && (!v.odometer || v.odometer <= 0))
      return 'Como você completou o tanque, informe a quilometragem (hodômetro) atual.';
    if (v.pricePerLiter !== undefined && v.pricePerLiter < 0)
      return 'O preço por litro não pode ser negativo.';
    return null;
  }

  /**
   * Habilita/desabilita o campo de hodômetro conforme o checkbox de tanque
   * cheio. Quando o tanque não foi completado, o hodômetro fica desabilitado
   * e vazio (não é necessário para o cálculo de autonomia).
   */
  private syncOdometerState(): void {
    const full = this.querySelector<HTMLInputElement>('#fullTank')!.checked;
    const odo = this.querySelector<HTMLInputElement>('#odometer')!;
    const label = this.querySelector('#odometer-label')!;

    odo.disabled = !full;
    odo.required = full;
    label.textContent = full ? 'Hodômetro (km) *' : 'Hodômetro (km)';

    if (full) {
      odo.placeholder = 'Ex: 45230';
      odo.classList.remove(
        'cursor-not-allowed',
        'bg-slate-100',
        'text-slate-400'
      );
    } else {
      odo.value = '';
      odo.placeholder = 'Apenas com tanque cheio';
      odo.classList.add('cursor-not-allowed', 'bg-slate-100', 'text-slate-400');
    }
  }

  private fillForm(
    r: Partial<RefuelingInput> & { fullTank?: boolean }
  ): void {
    this.setValue('#date', r.date ?? '');
    this.setValue('#liters', r.liters != null ? String(r.liters) : '');
    this.setValue('#odometer', r.odometer != null ? String(r.odometer) : '');
    this.setValue(
      '#pricePerLiter',
      r.pricePerLiter != null ? String(r.pricePerLiter) : ''
    );
    this.querySelector<HTMLInputElement>('#fullTank')!.checked =
      r.fullTank ?? true;
    // Reflete o estado (habilitado/obrigatório) do hodômetro.
    this.syncOdometerState();
  }

  private setValue(selector: string, value: string): void {
    const el = this.querySelector<HTMLInputElement>(selector);
    if (el) el.value = value;
  }

  private resetForm(): void {
    this.querySelector<HTMLFormElement>('#refueling-form')?.reset();
    this.hideError();
  }

  private showError(message: string): void {
    const el = this.querySelector('#modal-error')!;
    el.textContent = message;
    el.classList.remove('hidden');
  }

  private hideError(): void {
    this.querySelector('#modal-error')?.classList.add('hidden');
  }

  private render(): void {
    this.innerHTML = `
      <dialog id="refueling-dialog"
        class="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm">
        <form id="refueling-form" method="dialog" novalidate class="flex flex-col">
          <div class="flex items-start justify-between border-b border-slate-200 p-5">
            <div>
              <h2 id="modal-title" class="text-lg font-bold text-slate-900">Novo abastecimento</h2>
              <p id="modal-subtitle" class="text-sm text-slate-500">Registre os dados do abastecimento.</p>
            </div>
            <button type="button" id="cancel-refueling" data-close aria-label="Fechar"
              class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-4 p-5">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700" for="date">Data *</label>
              <input id="date" name="date" type="date" required class="${this.inputClass}" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for="liters">Litros *</label>
                <input id="liters" name="liters" type="number" required min="0.01" step="0.01" placeholder="Ex: 42,5" class="${this.inputClass}" />
              </div>
              <div>
                <label id="odometer-label" class="mb-1 block text-sm font-medium text-slate-700" for="odometer">Hodômetro (km) *</label>
                <input id="odometer" name="odometer" type="number" min="0" step="1" placeholder="Ex: 45230" class="${this.inputClass}" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700" for="pricePerLiter">Preço por litro (R$)</label>
              <input id="pricePerLiter" name="pricePerLiter" type="number" min="0" step="0.001" placeholder="Opcional — ex: 5,89" class="${this.inputClass}" />
            </div>
            <label class="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3">
              <input id="fullTank" name="fullTank" type="checkbox" checked
                class="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              <span class="text-sm">
                <span class="font-medium text-slate-800">Completei o tanque</span>
                <span class="block text-slate-500">Necessário para o cálculo correto da autonomia (km/l).</span>
              </span>
            </label>

            <p id="modal-error" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert"></p>
          </div>

          <div class="flex gap-3 border-t border-slate-200 p-5">
            <button type="button" id="cancel-refueling-2" data-close
              class="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" id="submit-refueling"
              class="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
              Adicionar
            </button>
          </div>
        </form>
      </dialog>
    `;
  }

  private get inputClass(): string {
    return 'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
  }
}

customElements.define('refueling-modal', RefuelingModal);
