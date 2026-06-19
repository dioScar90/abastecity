/**
 * Funções de formatação para o padrão brasileiro (pt-BR).
 */

const numberFmt = (digits: number) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function formatNumber(value: number, digits = 2): string {
  return numberFmt(digits).format(value);
}

export function formatLiters(value: number): string {
  return `${formatNumber(value, 2)} L`;
}

export function formatKm(value: number): string {
  return `${formatNumber(value, 0)} km`;
}

export function formatKmPerLiter(value: number): string {
  return `${formatNumber(value, 2)} Km/L`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/** Converte uma data ISO (YYYY-MM-DD) para o formato brasileiro (DD/MM/YYYY). */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

/** Retorna a data de hoje no formato ISO (YYYY-MM-DD) no fuso local. */
export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
