import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideTrendingUp } from '@lucide/angular';
import { ProductoTop } from '../services/dashboard.service';

const COLORES = ['lavender', 'cream', 'mint'];

@Component({
  selector: 'app-top-products',
  imports: [DecimalPipe, RouterLink, LucideArrowRight, LucideTrendingUp],
  styles: [':host { display: contents; }'],
  template: `
    <section class="panel forecast-panel">
      <div class="panel-heading">
        <div>
          <div class="panel-title-row">
            <h2>Productos más vendidos</h2>
          </div>
          <p class="panel-subtitle">Mayor salida en el período seleccionado</p>
        </div>
      </div>

      <div class="demand-list">
        @for (item of filas(); track item.nombre) {
          <div class="demand-row">
            <div class="product-thumb" [class]="'thumb-' + item.color">{{ item.iniciales }}</div>
            <div class="demand-product">
              <strong>{{ item.nombre }}</strong>
              <span>{{ item.categoria }}</span>
            </div>
            <div class="demand-stock">
              <span>Stock actual</span>
              <strong>{{ item.stock | number: '1.0-0' }} uds.</strong>
            </div>
            <span class="demand-change demand-blue">
              <svg lucideTrendingUp [size]="14"></svg>
              {{ item.unidades | number: '1.0-0' }} vendidas
            </span>
          </div>
        } @empty {
          <p class="panel-subtitle">Aún no hay ventas en este período.</p>
        }
      </div>

      <a class="panel-footer-link" routerLink="/ia/informe-inventario">
        Generar informe con IA <svg lucideArrowRight [size]="15"></svg>
      </a>
    </section>
  `,
})
export class TopProducts {
  readonly productos = input.required<ProductoTop[]>();

  protected readonly filas = computed(() =>
    this.productos().map((p, i) => ({
      ...p,
      iniciales: p.nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase(),
      color: COLORES[i % COLORES.length],
    })),
  );
}
