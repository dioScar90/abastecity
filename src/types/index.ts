/**
 * Tipos centrais da aplicação Abastecity.
 */

export type FuelType =
  | 'gasolina'
  | 'etanol'
  | 'diesel'
  | 'gnv'
  | 'flex';

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  gasolina: 'Gasolina',
  etanol: 'Etanol',
  diesel: 'Diesel',
  gnv: 'GNV',
  flex: 'Flex (Gasolina/Etanol)',
};

/** Usuário autenticado (subconjunto do User do Firebase). */
export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/** Veículo — exatamente um por usuário. */
export interface Vehicle {
  make: string; // Marca
  model: string; // Modelo
  year: number; // Ano
  plate?: string; // Placa (opcional)
  tankCapacity: number; // Capacidade do tanque (litros)
  fuelType: FuelType;
  updatedAt?: number; // epoch ms
}

/** Registro de abastecimento. */
export interface Refueling {
  id: string;
  /** Data do abastecimento no formato ISO (YYYY-MM-DD). */
  date: string;
  /** Litros abastecidos. */
  liters: number;
  /**
   * Quilometragem (hodômetro) no momento do abastecimento.
   * Obrigatório apenas quando o tanque é completado (fullTank = true);
   * ausente em abastecimentos parciais.
   */
  odometer?: number;
  /** Preço por litro (opcional). */
  pricePerLiter?: number;
  /** Indica se o tanque foi completado (necessário para o cálculo de autonomia). */
  fullTank: boolean;
  /** Carimbo de criação (epoch ms). */
  createdAt?: number;
}

/** Dados para criar/editar abastecimento (sem id). */
export type RefuelingInput = Omit<Refueling, 'id' | 'createdAt'>;

/** Ponto de autonomia calculado para o gráfico. */
export interface EfficiencyPoint {
  /** Data do abastecimento que fecha o trecho. */
  date: string;
  /** Quilômetros rodados no trecho. */
  distance: number;
  /** Litros consumidos no trecho. */
  liters: number;
  /** Autonomia do trecho (km/l). */
  kmPerLiter: number;
}
