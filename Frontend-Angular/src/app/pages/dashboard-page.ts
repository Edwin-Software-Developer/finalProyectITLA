import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideArrowUpRight,
  LucideBoxes,
  LucideBrainCircuit,
  LucideCalendarDays,
  LucideChevronDown,
  LucideFileChartColumnIncreasing,
  LucidePackage,
  LucidePlus,
  LucideShoppingBag,
  LucideShoppingCart,
  LucideUsers,
} from '@lucide/angular';
import { DemandForecast } from '../components/demand-forecast';
import { MetricCard } from '../components/metric-card';
import { SalesChart } from '../components/sales-chart';
import { AlertaInventario, DashboardService } from '../services/dashboard.service';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    MetricCard,
    SalesChart,
    DemandForecast,
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

  protected readonly period = signal('Últimos 7 días');
  protected readonly periods = ['Últimos 7 días', 'Últimos 30 días', 'Este año'];

  // Alertas de inventario: vienen de GET /api/dashboard/resumen (API → SQL Server)
  protected readonly alerts = signal<AlertaInventario[]>([]);
  protected readonly alertCount = signal(0);
  protected readonly alertsState = signal<LoadState>('loading');

  // Iconos pasados como datos a <app-metric-card>
  protected readonly icons = {
    sales: LucideShoppingCart,
    report: LucideFileChartColumnIncreasing,
    stock: LucideBoxes,
    ai: LucideBrainCircuit,
  };

  ngOnInit(): void {
    this.loadAlerts();
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
    this.period.set((event.target as HTMLSelectElement).value);
  }
}
