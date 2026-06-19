import './login-button';
import './app-header';
import './vehicle-form';
import './vehicle-card';
import './refueling-modal';
import './refueling-table';
import './efficiency-chart';

import { store, type AppState } from '../state/store';
import { isFirebaseConfigured } from '../firebase/config';
import {
  addRefueling,
  deleteRefueling,
  deleteVehicle,
  saveVehicle,
  updateRefueling,
} from '../firebase/firestore';
import { computeEfficiency, summarizeEfficiency } from '../utils/efficiency';
import { showToast } from '../utils/toast';
import type { Refueling, RefuelingInput, Vehicle } from '../types';

import type { AppHeader } from './app-header';
import type { VehicleForm } from './vehicle-form';
import type { VehicleCard } from './vehicle-card';
import type { RefuelingTable } from './refueling-table';
import type { EfficiencyChart } from './efficiency-chart';
import type { RefuelingModal } from './refueling-modal';

type View = 'init' | 'unconfigured' | 'login' | 'dashboard';

/**
 * <app-root> — Componente raiz. Orquestra estado, autenticação e a árvore
 * de componentes. Mantém referências aos filhos para atualizá-los sem
 * reconstruir a UI inteira a cada mudança de estado.
 */
export class AppRoot extends HTMLElement {
  private currentView: View | null = null;
  private editingVehicle = false;
  private lastState: AppState | null = null;

  connectedCallback(): void {
    if (!isFirebaseConfigured) {
      this.renderUnconfigured();
      return;
    }
    store.subscribe((state) => this.onState(state));
  }

  private onState(state: AppState): void {
    this.lastState = state;
    const view = this.resolveView(state);

    if (view !== this.currentView) {
      this.currentView = view;
      this.renderView(view);
    }

    if (view === 'dashboard') this.updateDashboard(state);
  }

  private resolveView(state: AppState): View {
    if (state.user === undefined) return 'init';
    if (state.user === null) return 'login';
    return 'dashboard';
  }

  /* ----------------------------- Views ----------------------------- */

  private renderView(view: View): void {
    switch (view) {
      case 'init':
        this.renderInit();
        break;
      case 'login':
        this.renderLogin();
        break;
      case 'dashboard':
        this.renderDashboard();
        break;
      default:
        break;
    }
  }

  private renderInit(): void {
    this.innerHTML = `
      <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"></div>
        <p class="text-sm font-medium text-slate-500">Carregando…</p>
      </div>
    `;
  }

  private renderUnconfigured(): void {
    this.innerHTML = `
      <div class="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div class="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <h2 class="mb-2 text-lg font-bold">Configuração necessária</h2>
          <p class="text-sm leading-relaxed">
            O Firebase ainda não foi configurado. Crie um arquivo <code class="rounded bg-amber-100 px-1">.env</code>
            na raiz do projeto com as credenciais do seu projeto Firebase
            (veja o <strong>README.md</strong>) e reinicie a aplicação.
          </p>
        </div>
      </div>
    `;
  }

  private renderLogin(): void {
    this.innerHTML = `
      <div class="relative min-h-screen overflow-hidden bg-slate-900">
        <div class="absolute inset-0 bg-gradient-to-br from-brand-800 via-slate-900 to-slate-950"></div>
        <div class="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl"></div>
        <div class="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl"></div>

        <div class="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <span class="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-5xl shadow-xl">⛽</span>
          <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Abasteci<span class="text-brand-400">ty</span>
          </h1>
          <p class="mt-3 max-w-md text-base text-slate-300">
            Acompanhe seus abastecimentos e descubra a autonomia real (km/l) do seu veículo.
          </p>

          <div class="mt-8">
            <login-button></login-button>
          </div>

          <ul class="mt-10 grid max-w-lg grid-cols-1 gap-3 text-left text-sm text-slate-300 sm:grid-cols-3">
            <li class="rounded-xl bg-white/5 p-3"><span class="mb-1 block text-xl">📊</span>Gráficos de consumo</li>
            <li class="rounded-xl bg-white/5 p-3"><span class="mb-1 block text-xl">☁️</span>Dados na nuvem</li>
            <li class="rounded-xl bg-white/5 p-3"><span class="mb-1 block text-xl">📱</span>Funciona offline</li>
          </ul>

          <p class="mt-10 text-xs text-slate-500">Seus dados ficam protegidos e isolados na sua conta Google.</p>
        </div>
      </div>
    `;
  }

  private renderDashboard(): void {
    this.editingVehicle = false;
    this.innerHTML = `
      <div class="min-h-screen bg-slate-50 pb-16">
        <app-header></app-header>
        <main class="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:py-6">
          <div id="vehicle-slot"></div>
          <div id="data-slot" class="space-y-5"></div>
        </main>
      </div>
      <refueling-modal></refueling-modal>
    `;

    // Eventos de veículo.
    this.addEventListener('vehicle-save', this.onVehicleSave);
    this.addEventListener('vehicle-edit', this.onVehicleEdit);
    this.addEventListener('vehicle-cancel', this.onVehicleCancel);
    this.addEventListener('vehicle-delete', this.onVehicleDelete);

    // Eventos de abastecimento.
    this.addEventListener('refueling-add', this.onRefuelingAdd);
    this.addEventListener('refueling-edit', this.onRefuelingEdit);
    this.addEventListener('refueling-delete', this.onRefuelingDelete);
    this.addEventListener('refueling-submit', this.onRefuelingSubmit);
  }

  /* ------------------------ Dashboard updates ----------------------- */

  private updateDashboard(state: AppState): void {
    const header = this.querySelector<AppHeader>('app-header');
    if (header) {
      header.user = state.user ?? null;
      header.online = state.online;
    }

    this.renderVehicleSlot(state);
    this.renderDataSlot(state);
  }

  private renderVehicleSlot(state: AppState): void {
    const slot = this.querySelector('#vehicle-slot');
    if (!slot) return;

    // Sem veículo: mostra formulário de cadastro (obrigatório).
    // Renderiza apenas uma vez para não apagar o que o usuário está digitando.
    if (!state.vehicle) {
      if (!slot.querySelector('vehicle-form')) {
        slot.innerHTML = `<vehicle-form class="block py-6"></vehicle-form>`;
        const form = slot.querySelector<VehicleForm>('vehicle-form')!;
        form.vehicle = null;
        form.showCancel = false;
      }
      return;
    }

    // Acabou de cadastrar/editar: remove o formulário remanescente.
    if (!this.editingVehicle && slot.querySelector('vehicle-form')) {
      slot.innerHTML = '';
    }

    // Com veículo: alterna entre formulário de edição e cartão.
    if (this.editingVehicle) {
      if (!slot.querySelector('vehicle-form')) {
        slot.innerHTML = `<vehicle-form class="block py-2"></vehicle-form>`;
        const form = slot.querySelector<VehicleForm>('vehicle-form')!;
        form.vehicle = state.vehicle;
        form.showCancel = true;
      }
      return;
    }

    if (!slot.querySelector('vehicle-card')) {
      slot.innerHTML = `<vehicle-card></vehicle-card>`;
    }
    const card = slot.querySelector<VehicleCard>('vehicle-card')!;
    card.vehicle = state.vehicle;
    card.summary = summarizeEfficiency(computeEfficiency(state.refuelings));
  }

  private renderDataSlot(state: AppState): void {
    const slot = this.querySelector('#data-slot');
    if (!slot) return;

    // Só exibe tabela/gráfico quando há veículo cadastrado.
    if (!state.vehicle) {
      slot.innerHTML = '';
      return;
    }

    if (!slot.querySelector('refueling-table')) {
      slot.innerHTML = `
        <refueling-table></refueling-table>
        <efficiency-chart></efficiency-chart>
      `;
    }

    const table = slot.querySelector<RefuelingTable>('refueling-table')!;
    table.items = state.refuelings;

    const chart = slot.querySelector<EfficiencyChart>('efficiency-chart')!;
    chart.items = state.refuelings;
  }

  /* --------------------------- Handlers ----------------------------- */

  private get uid(): string | null {
    return this.lastState?.user?.uid ?? null;
  }

  private onVehicleSave = async (e: Event): Promise<void> => {
    const detail = (e as CustomEvent<Vehicle>).detail;
    if (!this.uid) return;

    // Evita envio duplicado enquanto salva e durante a pausa até a transição.
    const submitBtn = this.querySelector<HTMLButtonElement>(
      '#vehicle-slot button[type="submit"]'
    );
    if (submitBtn) submitBtn.disabled = true;

    try {
      await saveVehicle(this.uid, detail);
      showToast('Veículo salvo com sucesso!', 'success');

      // Dá um instante para o usuário ver a confirmação e então transita
      // para o painel automaticamente. A atualização do estado é otimista
      // (não depende do tempo nem da saúde do listener do Firestore), o que
      // garante a transição mesmo logo após (re)configurar as regras.
      window.setTimeout(() => {
        this.editingVehicle = false;
        store.patch({ vehicle: detail });
      }, 1500);
    } catch (error) {
      if (submitBtn) submitBtn.disabled = false;
      console.error(error);
      showToast('Erro ao salvar o veículo.', 'error');
    }
  };

  private onVehicleEdit = (): void => {
    this.editingVehicle = true;
    const slot = this.querySelector('#vehicle-slot');
    if (slot) slot.innerHTML = '';
    if (this.lastState) this.renderVehicleSlot(this.lastState);
  };

  private onVehicleCancel = (): void => {
    this.editingVehicle = false;
    const slot = this.querySelector('#vehicle-slot');
    if (slot) slot.innerHTML = '';
    if (this.lastState) this.renderVehicleSlot(this.lastState);
  };

  private onVehicleDelete = async (): Promise<void> => {
    if (!this.uid) return;

    const count = this.lastState?.refuelings.length ?? 0;
    const message =
      count > 0
        ? `Tem certeza que deseja excluir o veículo? Isso também excluirá ${count} abastecimento${
            count > 1 ? 's' : ''
          } registrado${count > 1 ? 's' : ''}. Esta ação não pode ser desfeita.`
        : 'Tem certeza que deseja excluir o veículo? Esta ação não pode ser desfeita.';
    if (!window.confirm(message)) return;

    try {
      await deleteVehicle(this.uid);
      // Atualização otimista: volta ao formulário de cadastro imediatamente,
      // permitindo cadastrar um novo veículo sem recarregar.
      this.editingVehicle = false;
      store.patch({ vehicle: null, refuelings: [] });
      showToast('Veículo excluído. Você pode cadastrar um novo.', 'info');
    } catch (error) {
      console.error(error);
      showToast('Erro ao excluir o veículo.', 'error');
    }
  };

  private onRefuelingAdd = (): void => {
    this.modal?.openForCreate();
  };

  private onRefuelingEdit = (e: Event): void => {
    const id = (e as CustomEvent<string>).detail;
    const record = this.findRefueling(id);
    if (record) this.modal?.openForEdit(record);
  };

  private onRefuelingDelete = async (e: Event): Promise<void> => {
    const id = (e as CustomEvent<string>).detail;
    if (!this.uid) return;
    const record = this.findRefueling(id);
    if (!record) return;
    const ok = window.confirm(
      'Tem certeza que deseja excluir este abastecimento? Esta ação não pode ser desfeita.'
    );
    if (!ok) return;
    try {
      await deleteRefueling(this.uid, record.id);
      showToast('Abastecimento excluído.', 'info');
    } catch (error) {
      console.error(error);
      showToast('Erro ao excluir o abastecimento.', 'error');
    }
  };

  private onRefuelingSubmit = async (e: Event): Promise<void> => {
    const { id, input } = (
      e as CustomEvent<{ id: string | null; input: RefuelingInput }>
    ).detail;
    if (!this.uid) return;
    try {
      if (id) {
        await updateRefueling(this.uid, id, input);
        showToast('Abastecimento atualizado!', 'success');
      } else {
        await addRefueling(this.uid, input);
        showToast('Abastecimento adicionado!', 'success');
      }
      this.modal?.close();
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar o abastecimento.', 'error');
    }
  };

  private get modal(): RefuelingModal | null {
    return this.querySelector<RefuelingModal>('refueling-modal');
  }

  private findRefueling(id: string): Refueling | undefined {
    return this.lastState?.refuelings.find((r) => r.id === id);
  }
}

customElements.define('app-root', AppRoot);
