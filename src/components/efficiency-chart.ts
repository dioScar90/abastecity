import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Filler,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';
import { computeEfficiency, summarizeEfficiency } from '../utils/efficiency';
import type { Refueling } from '../types';
import { formatDate, formatKmPerLiter, formatNumber } from '../utils/format';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Filler,
  Tooltip,
  Legend
);

/**
 * <efficiency-chart> — Gráfico de autonomia (km/l) por trecho.
 * Recalcula e atualiza dinamicamente quando os abastecimentos mudam.
 */
export class EfficiencyChart extends HTMLElement {
  private _items: Refueling[] = [];
  private chart: Chart | null = null;

  set items(value: Refueling[]) {
    this._items = value;
    this.update();
  }

  connectedCallback(): void {
    this.render();
    this.update();
  }

  disconnectedCallback(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private render(): void {
    this.innerHTML = `
      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 class="text-base font-bold text-slate-900">Autonomia (km/l)</h3>
            <p class="text-sm text-slate-500">Calculada entre abastecimentos com tanque cheio.</p>
          </div>
          <div id="chart-stats" class="flex flex-wrap gap-2"></div>
        </div>
        <div id="chart-body"></div>
      </section>
    `;
  }

  private update(): void {
    const body = this.querySelector('#chart-body');
    const statsEl = this.querySelector('#chart-stats');
    if (!body || !statsEl) return;

    const points = computeEfficiency(this._items);
    const summary = summarizeEfficiency(points);

    // Resumo (chips de estatísticas).
    statsEl.innerHTML = summary
      ? `
        ${this.stat('Média', formatKmPerLiter(summary.averageKmPerLiter), 'brand')}
        ${this.stat('Melhor', formatKmPerLiter(summary.best), 'emerald')}
        ${this.stat('Pior', formatKmPerLiter(summary.worst), 'amber')}
      `
      : '';

    if (points.length === 0) {
      this.chart?.destroy();
      this.chart = null;
      body.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <span class="text-3xl">📈</span>
          <p class="font-medium text-slate-700">Dados insuficientes</p>
          <p class="max-w-sm text-sm text-slate-500">
            Registre pelo menos <strong>dois abastecimentos com tanque cheio</strong>
            para calcular a autonomia entre eles.
          </p>
        </div>
      `;
      return;
    }

    // Garante a presença do canvas.
    if (!body.querySelector('canvas')) {
      body.innerHTML = `<div class="relative h-64 sm:h-72"><canvas id="efficiency-canvas"></canvas></div>`;
    }
    const canvas = body.querySelector<HTMLCanvasElement>('#efficiency-canvas')!;

    const labels = points.map((p) => formatDate(p.date));
    const data = points.map((p) => Number(p.kmPerLiter.toFixed(2)));
    const avg = summary!.averageKmPerLiter;

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      (this.chart.data.datasets[1].data as number[]) = labels.map(() =>
        Number(avg.toFixed(2))
      );
      this.chart.update();
      return;
    }

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Autonomia (km/l)',
            data,
            borderColor: '#0d9488',
            backgroundColor: (ctx) => {
              const { chartArea, ctx: c } = ctx.chart;
              if (!chartArea) return 'rgba(13,148,136,0.15)';
              const gradient = c.createLinearGradient(
                0,
                chartArea.top,
                0,
                chartArea.bottom
              );
              gradient.addColorStop(0, 'rgba(13,148,136,0.35)');
              gradient.addColorStop(1, 'rgba(13,148,136,0.02)');
              return gradient;
            },
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#0d9488',
            pointHoverRadius: 6,
          },
          {
            label: 'Média',
            data: labels.map(() => Number(avg.toFixed(2))),
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            borderDash: [6, 6],
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (item) => {
                const y = item.parsed.y ?? 0;
                if (item.datasetIndex === 1)
                  return ` Média: ${formatKmPerLiter(y)}`;
                const p = points[item.dataIndex];
                return [
                  ` Autonomia: ${formatKmPerLiter(y)}`,
                  ` Trecho: ${formatNumber(p.distance, 0)} km`,
                  ` Consumo: ${formatNumber(p.liters, 2)} L`,
                ];
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: { callback: (v) => `${v} km/l` },
            grid: { color: 'rgba(148,163,184,0.15)' },
          },
          x: {
            grid: { display: false },
          },
        },
      },
    };

    this.chart = new Chart(canvas, config);
  }

  private stat(label: string, value: string, color: string): string {
    const palette: Record<string, string> = {
      brand: 'bg-brand-50 text-brand-700',
      emerald: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
    };
    return `
      <div class="rounded-xl ${palette[color]} px-3 py-1.5 text-center">
        <p class="text-[10px] font-semibold uppercase tracking-wide opacity-80">${label}</p>
        <p class="text-sm font-bold leading-none">${value}</p>
      </div>
    `;
  }
}

customElements.define('efficiency-chart', EfficiencyChart);
