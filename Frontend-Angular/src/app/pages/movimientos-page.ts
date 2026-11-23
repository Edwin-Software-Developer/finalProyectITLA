import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucidePlus, LucideRefreshCw, LucideX } from '@lucide/angular';
import { Observable } from 'rxjs';
import { apiErrorMessage } from '../services/api';
import { Movimiento, MovimientosService, TipoMovimiento } from '../services/movimientos.service';
import { Producto, ProductosService } from '../services/productos.service';
import { CatalogService } from '../services/catalog.service';

type LoadState = 'loading' | 'ready' | 'error';

const ETIQUETA: Record<TipoMovimiento, string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  AJUSTE: 'Ajuste',
  TRASLADO: 'Traslado',
};

@Component({
  selector: 'app-movimientos-page',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, LucidePlus, LucideRefreshCw, LucideX],
  templateUrl: './movimientos-page.html',
  // Misma apariencia de tabla/modal que Productos.
  styleUrl: './productos-page.css',
  styles: `
    .tipo { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #eef2f7; color: #475569; }
    .tipo-ENTRADA { background: #dcfce7; color: #15803d; }
    .tipo-SALIDA { background: #fee2e2; color: #b91c1c; }
    .tipo-AJUSTE { background: #fef3c7; color: #b45309; }
    .tipo-TRASLADO { background: #e0f2fe; color: #0369a1; }
    .pos { color: #15803d; font-weight: 700; }
    .neg { color: #b91c1c; font-weight: 700; }
    .hint { grid-column: 1 / -1; margin: 0; color: var(--muted); font-size: 13px; }
  `,
})
export class MovimientosPage implements OnInit {
  private readonly api = inject(MovimientosService);
  private readonly productosApi = inject(ProductosService);
  private readonly catalogApi = inject(CatalogService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly etiqueta = ETIQUETA;
  protected readonly tipos = Object.keys(ETIQUETA) as TipoMovimiento[];

  protected readonly movimientos = signal<Movimiento[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly loadError = signal('');

  protected readonly productos = signal<Producto[]>([]);
  protected readonly almacenes = signal<{ id: number; nombre: string }[]>([]);

  protected readonly search = signal('');
  protected readonly tipoFiltro = signal('');
  protected readonly almacenFiltro = signal(0);

  protected readonly filtrados = computed(() => {
    const q = this.search().trim().toLowerCase();
    const t = this.tipoFiltro();
    const a = this.almacenFiltro();
    return this.movimientos().filter(
      (m) =>
        (!t || m.tipo === t) &&
        (a === 0 || m.almacen_id === a) &&
        (!q || m.producto.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q)),
    );
  });

  protected readonly modalOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly submitted = signal(false);
  protected readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  protected readonly form = this.fb.group({
    tipo: ['ENTRADA' as TipoMovimiento],
    producto_id: [0, [Validators.min(1)]],
    almacen_id: [0, [Validators.min(1)]],
    almacen_destino_id: [0],
    cantidad: [0, [Validators.required]],
  });

  protected readonly tipoForm = signal<TipoMovimiento>('ENTRADA');

  ngOnInit(): void {
    this.load();
    this.productosApi.list().subscribe({ next: (p) => this.productos.set(p.filter((x) => x.activo)) });
    this.catalogApi.list('almacenes').subscribe({
      next: (a) => this.almacenes.set(a.map((x) => ({ id: Number(x['almacen_id']), nombre: String(x['nombre']) }))),
    });
    this.form.controls.tipo.valueChanges.subscribe((t) => this.tipoForm.set(t));
  }

  protected load(): void {
    this.state.set('loading');
    this.api.list().subscribe({
      next: (data) => {
        this.movimientos.set(data);
        this.state.set('ready');
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, 'No se pudieron cargar los movimientos.'));
        this.state.set('error');
      },
    });
  }

  protected onSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
  }
  protected onTipo(e: Event): void {
    this.tipoFiltro.set((e.target as HTMLSelectElement).value);
  }
  protected onAlmacen(e: Event): void {
    this.almacenFiltro.set(Number((e.target as HTMLSelectElement).value));
  }

  protected openCreate(): void {
    this.form.reset({ tipo: 'ENTRADA', producto_id: 0, almacen_id: 0, almacen_destino_id: 0, cantidad: 0 });
    this.tipoForm.set('ENTRADA');
    this.formError.set('');
    this.submitted.set(false);
    this.modalOpen.set(true);
  }

  @HostListener('window:keydown.escape')
  protected closeModal(): void {
    if (!this.saving()) this.modalOpen.set(false);
  }

  protected invalid(c: 'producto_id' | 'almacen_id' | 'almacen_destino_id' | 'cantidad'): boolean {
    if (!this.submitted() && !this.form.controls[c].touched) return false;
    return this.campoError(c) !== '';
  }

  protected campoError(c: 'producto_id' | 'almacen_id' | 'almacen_destino_id' | 'cantidad'): string {
    const v = this.form.getRawValue();
    switch (c) {
      case 'producto_id':
        return v.producto_id < 1 ? 'Selecciona un producto.' : '';
      case 'almacen_id':
        return v.almacen_id < 1 ? 'Selecciona un almacén.' : '';
      case 'almacen_destino_id':
        if (v.tipo !== 'TRASLADO') return '';
        if (v.almacen_destino_id < 1) return 'Selecciona el destino.';
        return v.almacen_destino_id === v.almacen_id ? 'El destino debe ser distinto del origen.' : '';
      case 'cantidad':
        if (v.tipo === 'AJUSTE') return v.cantidad === 0 || v.cantidad === null ? 'El ajuste no puede ser 0.' : '';
        return !(v.cantidad > 0) ? 'La cantidad debe ser mayor que 0.' : '';
    }
  }

  protected save(): void {
    this.submitted.set(true);
    const campos = ['producto_id', 'almacen_id', 'almacen_destino_id', 'cantidad'] as const;
    if (campos.some((c) => this.campoError(c) !== '')) return;

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set('');

    const request: Observable<unknown> =
      v.tipo === 'TRASLADO'
        ? this.api.trasladar({
            producto_id: v.producto_id,
            almacen_origen_id: v.almacen_id,
            almacen_destino_id: v.almacen_destino_id,
            cantidad: v.cantidad,
          })
        : this.api.create({ producto_id: v.producto_id, almacen_id: v.almacen_id, tipo: v.tipo, cantidad: v.cantidad });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.notice.set({ kind: 'ok', text: 'Movimiento registrado y existencias actualizadas.' });
        setTimeout(() => this.notice.set(null), 5000);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo registrar el movimiento.'));
      },
    });
  }
}
