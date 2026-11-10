import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import {
  LucideArrowRight,
  LucideArrowUpRight,
  LucideBell,
  LucideBoxes,
  LucideBrainCircuit,
  LucideCalendarDays,
  LucideChevronDown,
  LucideCommand,
  LucideFileChartColumnIncreasing,
  LucideMenu,
  LucidePackage,
  LucidePlus,
  LucideSearch,
  LucideShoppingBag,
  LucideShoppingCart,
  LucideUsers,
} from '@lucide/angular';
import { DemandForecast } from './components/demand-forecast';
import { MetricCard } from './components/metric-card';
import { SalesChart } from './components/sales-chart';
import { Sidebar } from './components/sidebar';
import { AlertaInventario, DashboardService } from './services/dashboard.service';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-root',
  imports: [
    Sidebar,
    MetricCard,
    SalesChart,
    DemandForecast,
    LucideArrowRight,
    LucideArrowUpRight,
    LucideBell,
    LucideCalendarDays,
    LucideChevronDown,
    LucideCommand,
    LucideMenu,
    LucidePackage,
    LucidePlus,
    LucideSearch,
    LucideShoppingBag,
    LucideShoppingCart,
    LucideUsers,
  ],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  protected readonly menuOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly period = signal('Últimos 7 días');
  protected readonly periods = ['Últimos 7 días', 'Últimos 30 días', 'Este año'];

  // Alertas de inventario: vienen del endpoint GET /api/dashboard/resumen
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

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchOpen.set(true);
      document.getElementById('global-search')?.focus();
    }
    if (event.key === 'Escape') {
      this.menuOpen.set(false);
      this.searchOpen.set(false);
    }
  }

  protected onPeriodChange(event: Event): void {
    this.period.set((event.target as HTMLSelectElement).value);
  }
}
