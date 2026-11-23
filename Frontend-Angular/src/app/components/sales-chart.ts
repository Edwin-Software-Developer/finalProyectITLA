import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { PuntoVenta } from '../services/dashboard.service';

const WIDTH = 720;
const HEIGHT = 218;
const TOP = 14;
const BOTTOM = 184;

/** Redondea hacia arriba a un valor "limpio" (1, 2, 5 × 10^n) para el eje Y. */
function techoLimpio(valor: number): number {
  if (valor <= 0) return 100;
  const magnitud = 10 ** Math.floor(Math.log10(valor));
  const fraccion = valor / magnitud;
  const paso = fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 5 ? 5 : 10;
  return paso * magnitud;
}

function abreviar(valor: number): string {
  if (valor >= 1_000_000) return `RD$ ${+(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `RD$ ${+(valor / 1_000).toFixed(1)}k`;
  return `RD$ ${valor}`;
}

@Component({
  selector: 'app-sales-chart',
  imports: [DatePipe],
  styles: [':host { display: contents; }'],
  template: `
    <div class="chart-wrap" role="img" [attr.aria-label]="'Gráfico de ventas de los últimos ' + data().length + ' días'">
      <div class="chart-y-labels" aria-hidden="true">
        @for (label of yLabels(); track $index) {
          <span>{{ label }}</span>
        }
      </div>
      <div class="chart-main">
        <svg
          aria-hidden="true"
          class="sales-chart"
          preserveAspectRatio="none"
          [attr.viewBox]="'0 0 ' + width + ' ' + height"
        >
          <defs>
            <linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#3979f6" stop-opacity=".18" />
              <stop offset="100%" stop-color="#3979f6" stop-opacity="0" />
            </linearGradient>
          </defs>
          @for (y of gridLines; track y) {
            <line
              x1="0"
              [attr.x2]="width"
              [attr.y1]="y"
              [attr.y2]="y"
              stroke="#edf0f5"
              [attr.stroke-dasharray]="y === 184 ? '0' : '3 5'"
            />
          }
          @if (points().length > 1) {
            <path [attr.d]="areaPath()" fill="url(#sales-fill)" />
            <polyline
              fill="none"
              [attr.points]="linePoints()"
              stroke="#3979f6"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              vector-effect="non-scaling-stroke"
            />
            @if (data().length <= 14) {
              @for (p of points(); track $index) {
                <circle
                  [attr.cx]="p.x"
                  [attr.cy]="p.y"
                  fill="#fff"
                  r="4"
                  stroke="#3979f6"
                  stroke-width="2.5"
                  vector-effect="non-scaling-stroke"
                />
              }
            }
          }
        </svg>
        <div class="chart-x-labels" aria-hidden="true">
          @for (p of xLabels(); track $index) {
            <span>{{ p.fecha | date: 'dd MMM' }}</span>
          }
        </div>
      </div>
    </div>
  `,
})
export class SalesChart {
  readonly data = input.required<PuntoVenta[]>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly gridLines = [14, 56, 99, 141, 184];

  private readonly techo = computed(() => techoLimpio(Math.max(0, ...this.data().map((p) => p.total))));

  protected readonly yLabels = computed(() =>
    [4, 3, 2, 1, 0].map((i) => abreviar((this.techo() / 4) * i)),
  );

  protected readonly points = computed(() => {
    const d = this.data();
    if (d.length < 2) return [];
    return d.map((p, i) => ({
      x: (i / (d.length - 1)) * WIDTH,
      y: BOTTOM - (p.total / this.techo()) * (BOTTOM - TOP),
    }));
  });

  /** Hasta 7 etiquetas repartidas a lo largo del período. */
  protected readonly xLabels = computed(() => {
    const d = this.data();
    if (d.length <= 7) return d;
    const n = 7;
    return Array.from({ length: n }, (_, i) => d[Math.round((i * (d.length - 1)) / (n - 1))]);
  });

  protected readonly linePoints = computed(() =>
    this.points()
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );

  protected readonly areaPath = computed(
    () => `M 0,${BOTTOM} L ${this.linePoints().replaceAll(' ', ' L ')} L ${WIDTH},${BOTTOM} Z`,
  );
}
