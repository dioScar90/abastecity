import type { AuthUser, Refueling, Vehicle } from '../types';
import { observeAuth } from '../firebase/auth';
import {
  observeRefuelings,
  observeVehicle,
} from '../firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

export interface AppState {
  /** undefined = ainda carregando o estado de auth. */
  user: AuthUser | null | undefined;
  vehicle: Vehicle | null;
  refuelings: Refueling[];
  loadingData: boolean;
  error: string | null;
  online: boolean;
}

type Listener = (state: AppState) => void;

/**
 * Store reativo simples (padrão pub/sub). Componentes assinam mudanças e
 * recebem o estado completo. Centraliza a sincronização com o Firebase.
 */
class Store {
  private state: AppState = {
    user: undefined,
    vehicle: null,
    refuelings: [],
    loadingData: false,
    error: null,
    online: navigator.onLine,
  };

  private listeners = new Set<Listener>();
  private dataUnsubs: Unsubscribe[] = [];

  constructor() {
    window.addEventListener('online', () => this.patch({ online: true }));
    window.addEventListener('offline', () => this.patch({ online: false }));
  }

  /** Inicia a observação do estado de autenticação. */
  init(): void {
    observeAuth((user) => {
      if (user) {
        this.patch({ user });
        this.bindUserData(user.uid);
      } else {
        this.unbindUserData();
        this.patch({
          user: null,
          vehicle: null,
          refuelings: [],
          loadingData: false,
        });
      }
    });
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Emite o estado atual imediatamente.
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  patch(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }

  private bindUserData(uid: string): void {
    this.unbindUserData();
    this.patch({ loadingData: true, error: null });

    let vehicleLoaded = false;
    let refuelingsLoaded = false;
    const maybeDoneLoading = () => {
      if (vehicleLoaded && refuelingsLoaded) {
        this.patch({ loadingData: false });
      }
    };

    this.dataUnsubs.push(
      observeVehicle(
        uid,
        (vehicle) => {
          vehicleLoaded = true;
          this.patch({ vehicle });
          maybeDoneLoading();
        },
        (err) => this.patch({ error: this.describeError(err) })
      )
    );

    this.dataUnsubs.push(
      observeRefuelings(
        uid,
        (refuelings) => {
          refuelingsLoaded = true;
          this.patch({ refuelings });
          maybeDoneLoading();
        },
        (err) => this.patch({ error: this.describeError(err) })
      )
    );
  }

  private unbindUserData(): void {
    this.dataUnsubs.forEach((u) => u());
    this.dataUnsubs = [];
  }

  private describeError(err: Error): string {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'permission-denied') {
      return 'Sem permissão para acessar os dados. Verifique as regras do Firestore.';
    }
    if (code === 'unavailable') {
      return 'Você está offline. Exibindo dados em cache, se disponíveis.';
    }
    return err.message || 'Ocorreu um erro ao carregar os dados.';
  }
}

export const store = new Store();
