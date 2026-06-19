import type { EfficiencyPoint, Refueling } from '../types';

/**
 * Cálculo de autonomia (km/l) baseado em abastecimentos com tanque cheio.
 *
 * Metodologia (método do tanque cheio):
 * - A autonomia só pode ser medida entre dois abastecimentos com tanque cheio.
 * - O primeiro tanque cheio serve apenas como "marco zero" (referência de
 *   hodômetro), pois não sabemos quanto foi rodado antes dele.
 * - A partir daí, somam-se os litros de cada abastecimento até o próximo
 *   tanque cheio. Quando ele ocorre, a autonomia do trecho é:
 *
 *       km/l = (hodômetro_atual - hodômetro_do_último_cheio) / litros_somados
 *
 *   Os litros somados representam exatamente o combustível necessário para
 *   percorrer a distância do trecho (já que o tanque voltou a ficar cheio).
 *
 * Abastecimentos parciais (fullTank = false) acumulam litros, mas não fecham
 * um trecho.
 */
export function computeEfficiency(refuelings: Refueling[]): EfficiencyPoint[] {
  // Ordena cronologicamente. O hodômetro só existe nos abastecimentos com
  // tanque cheio, então a data é a chave principal e o hodômetro (quando
  // presente) serve apenas como desempate dentro do mesmo dia.
  const ordered = [...refuelings].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const ao = a.odometer ?? Number.MAX_SAFE_INTEGER;
    const bo = b.odometer ?? Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });

  const points: EfficiencyPoint[] = [];

  let lastFullOdometer: number | null = null;
  let accumulatedLiters = 0;

  for (const r of ordered) {
    if (lastFullOdometer === null) {
      // Ainda procurando o primeiro tanque cheio (marco zero). Só serve de
      // marco se tiver hodômetro registrado.
      if (r.fullTank && r.odometer != null) {
        lastFullOdometer = r.odometer;
        accumulatedLiters = 0;
      }
      continue;
    }

    // Já temos um marco. Acumula os litros deste abastecimento.
    accumulatedLiters += r.liters;

    if (r.fullTank && r.odometer != null) {
      const distance = r.odometer - lastFullOdometer;
      // Protege contra dados inconsistentes (hodômetro não crescente / litros 0).
      if (distance > 0 && accumulatedLiters > 0) {
        points.push({
          date: r.date,
          distance,
          liters: accumulatedLiters,
          kmPerLiter: distance / accumulatedLiters,
        });
      }
      // Novo marco zero.
      lastFullOdometer = r.odometer;
      accumulatedLiters = 0;
    }
  }

  return points;
}

export interface EfficiencySummary {
  /** Média geral de autonomia ponderada por distância (km/l). */
  averageKmPerLiter: number;
  /** Distância total considerada nos trechos completos (km). */
  totalDistance: number;
  /** Litros totais consumidos nos trechos completos. */
  totalLiters: number;
  /** Melhor trecho registrado (km/l). */
  best: number;
  /** Pior trecho registrado (km/l). */
  worst: number;
  /** Quantidade de trechos completos calculados. */
  segments: number;
}

export function summarizeEfficiency(
  points: EfficiencyPoint[]
): EfficiencySummary | null {
  if (points.length === 0) return null;

  const totalDistance = points.reduce((s, p) => s + p.distance, 0);
  const totalLiters = points.reduce((s, p) => s + p.liters, 0);
  const values = points.map((p) => p.kmPerLiter);

  return {
    averageKmPerLiter: totalLiters > 0 ? totalDistance / totalLiters : 0,
    totalDistance,
    totalLiters,
    best: Math.max(...values),
    worst: Math.min(...values),
    segments: points.length,
  };
}
