import { Component, signal } from '@angular/core';
import {
  LucideArrowRight,
  LucideArrowUpRight,
  LucideBrainCircuit,
  LucideRefreshCw,
  LucideSparkles,
} from '@lucide/angular';
import { demandItems } from '../data/dashboard.data';

@Component({
  selector: 'app-demand-forecast',
  imports: [LucideArrowRight, LucideArrowUpRight, LucideBrainCircuit, LucideRefreshCw, LucideSparkles],
  styles: [':host { display: contents; }'],
  template: `
    <section class="panel forecast-panel">
      <div class="panel-heading">
        <div>
          <div class="panel-title-row">
            <div class="ai-title-icon"><svg lucideSparkles [size]="16"></svg></div>
            <h2>Predicción de demanda</h2>
            <span class="live-badge"><span></span> IA ACTIVA</span>
          </div>
          <p class="panel-subtitle">Productos con mayor demanda para los próximos 7 días</p>
        </div>
        <button
          aria-label="Actualizar predicción"
          class="icon-button refresh-button"
          [class.is-spinning]="loading()"
          title="Actualizar predicción"
          (click)="refreshForecast()"
        >
          <svg lucideRefreshCw [size]="16"></svg>
        </button>
      </div>

      <div class="forecast-summary">
        <div class="forecast-summary-icon"><svg lucideBrainCircuit [size]="17"></svg></div>
        <p>
          El modelo detectó un <strong>incremento de demanda</strong> en 3 productos que requieren
          atención.
        </p>
        <span class="forecast-confidence">94% confianza</span>
      </div>

      <div class="demand-list">
        @for (item of items; track item.name) {
          @if (loading()) {
            <div class="demand-skeleton">
              <span class="skeleton skeleton-product"></span>
              <span class="skeleton skeleton-stock"></span>
              <span class="skeleton skeleton-demand"></span>
            </div>
          } @else {
            <div class="demand-row">
              <div class="product-thumb" [class]="'thumb-' + item.color">{{ item.initials }}</div>
              <div class="demand-product">
                <strong>{{ item.name }}</strong>
                <span>{{ item.category }}</span>
              </div>
              <div class="demand-stock">
                <span>Stock actual</span>
                <strong>{{ item.stock }}</strong>
              </div>
              <span class="demand-change" [class]="'demand-' + item.tone">
                <svg lucideArrowUpRight [size]="14"></svg>
                {{ item.demand }}
              </span>
              <button [attr.aria-label]="'Ver predicción para ' + item.name" class="row-arrow">
                <svg lucideArrowRight [size]="16"></svg>
              </button>
            </div>
          }
        }
      </div>

      <a class="panel-footer-link" href="/ia/predicciones">
        Ver todas las predicciones <svg lucideArrowRight [size]="15"></svg>
      </a>
    </section>
  `,
})
export class DemandForecast {
  protected readonly items = demandItems;
  protected readonly loading = signal(false);

  protected refreshForecast(): void {
    this.loading.set(true);
    setTimeout(() => this.loading.set(false), 750);
  }
}
