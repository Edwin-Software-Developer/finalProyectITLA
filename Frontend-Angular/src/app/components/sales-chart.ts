import { Component, computed } from '@angular/core';
import { salesData } from '../data/dashboard.data';

const WIDTH = 720;
const HEIGHT = 218;
const TOP = 14;
const BOTTOM = 184;

@Component({
  selector: 'app-sales-chart',
  styles: [':host { display: contents; }'],
  template: `
    <div
      class="chart-wrap"
      role="img"
      aria-label="Gráfico de ventas de los últimos 12 días con tendencia ascendente"
    >
      <div class="chart-y-labels" aria-hidden="true">
        <span>RD$ 80k</span>
        <span>RD$ 60k</span>
        <span>RD$ 40k</span>
        <span>RD$ 20k</span>
        <span>RD$ 0</span>
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
        </svg>
        <div class="chart-x-labels" aria-hidden="true">
          @for (label of xLabels; track label) {
            <span>{{ label }}</span>
          }
        </div>
      </div>
    </div>
  `,
})
export class SalesChart {
  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly gridLines = [14, 56, 99, 141, 184];
  protected readonly xLabels = ['03 Oct', '05 Oct', '07 Oct', '09 Oct', '11 Oct', '13 Oct', '14 Oct'];

  protected readonly points = computed(() =>
    salesData.map((point, index) => ({
      x: (index / (salesData.length - 1)) * WIDTH,
      y: BOTTOM - (point.value / 110) * (BOTTOM - TOP),
    })),
  );

  protected readonly linePoints = computed(() =>
    this.points()
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );

  protected readonly areaPath = computed(
    () => `M 0,${BOTTOM} L ${this.linePoints().replaceAll(' ', ' L ')} L ${WIDTH},${BOTTOM} Z`,
  );
}
