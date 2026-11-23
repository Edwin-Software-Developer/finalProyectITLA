import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideRefreshCw, LucideX } from '@lucide/angular';
import { apiErrorMessage } from '../services/api';
import { AuthService } from '../services/auth.service';
import { VentaDetalle, VentaResumen, VentasService } from '../services/ventas.service';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-ventas-page',
  imports: [DatePipe, DecimalPipe, RouterLink, LucidePlus, LucideRefreshCw, LucideX],
  templateUrl: './ventas-page.html',
  // Misma apariencia de tabla/modal que Productos.
  styleUrl: './productos-page.css',
  styles: `
    .estado { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .estado-COMPLETADA { background: #dcfce7; color: #15803d; }
    .estado-ANULADA { background: #fee2e2; color: #b91c1c; }
    .modal-wide { width: min(820px, 96vw); max-height: 92vh; overflow: auto; }
    .resumen { display: flex; gap: 18px; flex-wrap: wrap; color: var(--muted); font-size: 13px; margin-bottom: 12px; }
    .totales { text-align: right; font-weight: 700; margin-top: 8px; }
    .fila-click { cursor: pointer; }
    .fila-click:hover { background: #f7f9fc; }
    a.primary-button { text-decoration: none; }
  `,
})
export class VentasPage implements OnInit {
  private readonly api = inject(VentasService);
  protected readonly isAdmin = inject(AuthService).isAdmin;

  protected readonly ventas = signal<VentaResumen[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly loadError = signal('');
  protected readonly search = signal('');
  protected readonly estado = signal('');

  protected readonly filtradas = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.ventas().filter(
      (v) =>
        (!this.estado() || v.estado === this.estado()) &&
        (!q || v.numero_factura.toLowerCase().includes(q) || (v.cliente ?? '').toLowerCase().includes(q)),
    );
  });

  protected readonly detalle = signal<VentaDetalle | null>(null);
  protected readonly procesando = signal(false);
  protected readonly detalleError = signal('');
  protected readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.api.list().subscribe({
      next: (v) => {
        this.ventas.set(v);
        this.state.set('ready');
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, 'No se pudo cargar el historial de ventas.'));
        this.state.set('error');
      },
    });
  }

  protected onSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
  }
  protected onEstado(e: Event): void {
    this.estado.set((e.target as HTMLSelectElement).value);
  }

  protected abrir(v: VentaResumen): void {
    this.detalleError.set('');
    this.api.get(v.venta_id).subscribe({
      next: (d) => this.detalle.set(d),
      error: (err) => this.showNotice('error', apiErrorMessage(err, 'No se pudo abrir la venta.')),
    });
  }

  @HostListener('window:keydown.escape')
  protected cerrar(): void {
    if (!this.procesando()) this.detalle.set(null);
  }

  protected anular(d: VentaDetalle): void {
    if (!confirm(`¿Anular la venta ${d.venta.numero_factura}? Las existencias volverán al inventario.`)) return;
    this.procesando.set(true);
    this.detalleError.set('');
    this.api.anular(d.venta.venta_id).subscribe({
      next: () => {
        this.procesando.set(false);
        this.detalle.set(null);
        this.showNotice('ok', 'Venta anulada y existencias devueltas al inventario.');
        this.load();
      },
      error: (err) => {
        this.procesando.set(false);
        this.detalleError.set(apiErrorMessage(err, 'No se pudo anular la venta.'));
      },
    });
  }

  private showNotice(kind: 'ok' | 'error', text: string): void {
    this.notice.set({ kind, text });
    setTimeout(() => this.notice.set(null), 5000);
  }
}
