import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideArrowUpRight,
  LucideBoxes,
  LucideReceipt,
  LucideCalendarDays,
  LucideChevronDown,
  LucideFileChartColumnIncreasing,
  LucidePackage,
  LucidePlus,
  LucideShoppingBag,
  LucideShoppingCart,
  LucideUsers,
} from '@lucide/angular';
import { TopProducts } from '../components/top-products';
import { MetricCard } from '../components/metric-card';
import { SalesChart } from '../components/sales-chart';
import { AuthService } from '../services/auth.service';
import { AlertaInventario, DashboardService, VentasDashboard } from '../services/dashboard.service';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    MetricCard,
    SalesChart,
    TopProducts,
    LucideArrowRight,
    LucideArrowUpRight,
    LucideCalendarDays,
    LucideChevronDown,
    LucidePackage,
    LucidePlus,
    LucideShoppingBag,
    LucideShoppingCart,
    LucideUsers,
  ],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly auth = inject(AuthService);

  protected readonly firstName = computed(() => this.auth.user()?.nombre.trim().split(/\s+/)[0] ?? '');

  protected readonly periods = [
    { label: 'Últimos 7 días', dias: 7 },
    { label: 'Últimos 30 días', dias: 30 },
    { label: 'Últimos 90 días', dias: 90 },
  ];
  protected readonly dias = signal(7);

  // Ventas reales: GET /api/dashboard/ventas?dias=N
  protected readonly ventas = signal<VentasDashboard | null>(null);
  protected readonly ventasState = signal<LoadState>('loading');

  protected readonly hoy = new Date().toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  protected readonly anio = new Date().getFullYear();

  protected readonly periodLabel = computed(
    () => this.periods.find((p) => p.dias === this.dias())?.label ?? '',
  );

  protected readonly ticketPromedio = computed(() => {
    const v = this.ventas();
    return v && v.transaccionesPeriodo > 0 ? v.totalPeriodo / v.transaccionesPeriodo : 0;
  });

  // Alertas de inventario: vienen de GET /api/dashboard/resumen (API → SQL Server)
  protected readonly alerts = signal<AlertaInventario[]>([]);
  protected readonly alertCount = signal(0);
  protected readonly alertsState = signal<LoadState>('loading');

  // Iconos pasados como datos a <app-metric-card>
  protected readonly icons = {
    sales: LucideShoppingCart,
    report: LucideFileChartColumnIncreasing,
    stock: LucideBoxes,
    ticket: LucideReceipt,
  };

  ngOnInit(): void {
    this.loadAlerts();
    this.loadVentas();
  }

  protected loadVentas(): void {
    this.ventasState.set('loading');
    this.dashboardService.getVentas(this.dias()).subscribe({
      next: (v) => {
        this.ventas.set(v);
        this.ventasState.set('ready');
      },
      error: () => this.ventasState.set('error'),
    });
  }

  /** "RD$ 1,234" (sin centavos para que quepa en la tarjeta). */
  protected money(value: number): string {
    return 'RD$ ' + Math.round(value).toLocaleString('es-DO');
  }

  /** Variación porcentual contra el período de comparación; "nuevo" si antes era 0. */
  protected pct(actual: number, anterior: number): string {
    if (anterior <= 0) return actual > 0 ? 'nuevo' : '0%';
    const p = ((actual - anterior) / anterior) * 100;
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
  }

  protected trend(actual: number, anterior: number): 'up' | 'down' {
    return actual >= anterior ? 'up' : 'down';
  }

  protected loadAlerts(): void {
    this.alertsState.set('loading');
    this.dashboardService.getResumen().subscribe({
      next: (resumen) => {
        this.alerts.set(resumen.alertas);
        this.alertCount.set(resumen.totalAlertas);
        this.alertsState.set('ready');
      },
      error: () => this.alertsState.set('error'),
    });
  }

  protected onPeriodChange(event: Event): void {
    this.dias.set(Number((event.target as HTMLSelectElement).value));
    this.loadVentas();
  }
}
