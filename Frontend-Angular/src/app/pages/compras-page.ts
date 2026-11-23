import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucidePlus, LucideRefreshCw, LucideSparkles, LucideTrash2, LucideX } from '@lucide/angular';
import { apiErrorMessage } from '../services/api';
import { CatalogService } from '../services/catalog.service';
import {
  ComprasService,
  EstadoOrden,
  OrdenDetalle,
  OrdenResumen,
} from '../services/compras.service';
import { Producto, ProductosService } from '../services/productos.service';

type LoadState = 'loading' | 'ready' | 'error';
interface Opcion {
  id: number;
  nombre: string;
}

const ETIQUETA: Record<EstadoOrden, string> = {
  PENDIENTE: 'Pendiente',
  RECIBIDA_PARCIAL: 'Recibida parcial',
  RECIBIDA: 'Recibida',
  CANCELADA: 'Cancelada',
};

@Component({
  selector: 'app-compras-page',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, LucidePlus, LucideRefreshCw, LucideSparkles, LucideTrash2, LucideX],
  templateUrl: './compras-page.html',
  // Misma apariencia de tabla/modal que Productos.
  styleUrl: './productos-page.css',
  styles: `
    .estado { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #eef2f7; color: #475569; }
    .estado-PENDIENTE { background: #fef3c7; color: #b45309; }
    .estado-RECIBIDA_PARCIAL { background: #e0f2fe; color: #0369a1; }
    .estado-RECIBIDA { background: #dcfce7; color: #15803d; }
    .estado-CANCELADA { background: #fee2e2; color: #b91c1c; }
    .modal-wide { width: min(880px, 96vw); max-height: 92vh; overflow: auto; }
    .linea { display: grid; grid-template-columns: 3fr 1fr 1fr 1fr auto; gap: 8px; align-items: end; margin-bottom: 8px; }
    .linea .field { margin: 0; }
    .fila-click { cursor: pointer; }
    .fila-click:hover { background: #f7f9fc; }
    .totales { text-align: right; font-weight: 700; margin-top: 8px; }
    .barra { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 12px; }
    .resumen { display: flex; gap: 18px; flex-wrap: wrap; color: var(--muted); font-size: 13px; margin-bottom: 12px; }
    .recibir input { width: 90px; }
    @media (max-width: 720px) { .linea { grid-template-columns: 1fr 1fr; } }
  `,
})
export class ComprasPage implements OnInit {
  private readonly api = inject(ComprasService);
  private readonly catalogApi = inject(CatalogService);
  private readonly productosApi = inject(ProductosService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly etiqueta = ETIQUETA;
  protected readonly estados = Object.keys(ETIQUETA) as EstadoOrden[];

  protected readonly ordenes = signal<OrdenResumen[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly loadError = signal('');
  protected readonly estadoFiltro = signal('');
  protected readonly filtradas = computed(() =>
    this.ordenes().filter((o) => !this.estadoFiltro() || o.estado === this.estadoFiltro()),
  );

  protected readonly proveedores = signal<Opcion[]>([]);
  protected readonly almacenes = signal<Opcion[]>([]);
  protected readonly monedas = signal<(Opcion & { simbolo: string; es_base: boolean })[]>([]);
  protected readonly productos = signal<Producto[]>([]);

  protected readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // ----- Nueva orden -----
  protected readonly modalNueva = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly submitted = signal(false);
  protected readonly cargandoSugeridos = signal(false);
  private origen: 'MANUAL' | 'AUTO' = 'MANUAL';

  protected readonly form = this.fb.group({
    proveedor_id: [0, [Validators.min(1)]],
    almacen_id: [0, [Validators.min(1)]],
    moneda_id: [0, [Validators.min(1)]],
    fecha_entrega_esperada: [''],
    notas: ['', [Validators.maxLength(500)]],
    lineas: this.fb.array([] as ReturnType<ComprasPage['nuevaLinea']>[]),
  });

  protected get lineas(): FormArray {
    return this.form.controls.lineas as unknown as FormArray;
  }

  protected readonly subtotalEstimado = signal(0);

  // ----- Detalle / recepción -----
  protected readonly detalle = signal<OrdenDetalle | null>(null);
  protected readonly recibir = signal<Record<number, number>>({});
  protected readonly procesando = signal(false);
  protected readonly detalleError = signal('');

  ngOnInit(): void {
    this.load();
    this.catalogApi.list('proveedores').subscribe({
      next: (r) =>
        this.proveedores.set(r.filter((x) => x['activo']).map((x) => ({ id: Number(x['proveedor_id']), nombre: String(x['nombre']) }))),
    });
    this.catalogApi.list('almacenes').subscribe({
      next: (r) => this.almacenes.set(r.map((x) => ({ id: Number(x['almacen_id']), nombre: String(x['nombre']) }))),
    });
    this.catalogApi.list('monedas').subscribe({
      next: (r) =>
        this.monedas.set(
          r.filter((x) => x['activo']).map((x) => ({
            id: Number(x['moneda_id']),
            nombre: `${x['codigo']} · ${x['nombre']}`,
            simbolo: String(x['simbolo']),
            es_base: !!x['es_base'],
          })),
        ),
    });
    this.productosApi.list().subscribe({ next: (p) => this.productos.set(p.filter((x) => x.activo)) });
  }

  protected load(): void {
    this.state.set('loading');
    this.api.list().subscribe({
      next: (data) => {
        this.ordenes.set(data);
        this.state.set('ready');
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, 'No se pudieron cargar las órdenes de compra.'));
        this.state.set('error');
      },
    });
  }

  protected onEstado(e: Event): void {
    this.estadoFiltro.set((e.target as HTMLSelectElement).value);
  }

  // ===================== Nueva orden =====================

  private nuevaLinea(producto_id = 0, cantidad = 1, costo = 0) {
    return this.fb.group({
      producto_id: [producto_id, [Validators.min(1)]],
      cantidad: [cantidad, [Validators.required, Validators.min(0.01)]],
      costo_unitario: [costo, [Validators.required, Validators.min(0)]],
      descuento_porcentaje: [0, [Validators.min(0), Validators.max(100)]],
    });
  }

  protected openNueva(): void {
    this.lineas.clear();
    this.lineas.push(this.nuevaLinea());
    const base = this.monedas().find((m) => m.es_base);
    this.form.patchValue({ proveedor_id: 0, almacen_id: 0, moneda_id: base?.id ?? 0, fecha_entrega_esperada: '', notas: '' });
    this.origen = 'MANUAL';
    this.formError.set('');
    this.submitted.set(false);
    this.recalcular();
    this.modalNueva.set(true);
  }

  protected agregarLinea(): void {
    this.lineas.push(this.nuevaLinea());
  }

  protected quitarLinea(i: number): void {
    this.lineas.removeAt(i);
    this.recalcular();
  }

  protected onProducto(i: number): void {
    const g = this.lineas.at(i);
    const p = this.productos().find((x) => x.producto_id === g.get('producto_id')!.value);
    if (p) g.patchValue({ costo_unitario: p.costo_unitario });
    this.recalcular();
  }

  protected recalcular(): void {
    const total = this.lineas.controls.reduce((acc, g) => {
      const v = g.getRawValue();
      return acc + v.cantidad * v.costo_unitario * (1 - v.descuento_porcentaje / 100);
    }, 0);
    this.subtotalEstimado.set(total);
  }

  /** Rellena las líneas con lo que Reposición sugiere para el almacén elegido. */
  protected cargarSugeridos(): void {
    const almacen = this.form.controls.almacen_id.value;
    if (almacen < 1) {
      this.formError.set('Elige primero el almacén de destino para cargar los sugeridos.');
      return;
    }
    this.cargandoSugeridos.set(true);
    this.formError.set('');
    this.api.sugerencias().subscribe({
      next: (todas) => {
        this.cargandoSugeridos.set(false);
        const s = todas.filter((x) => x.almacen_id === almacen);
        if (s.length === 0) {
          this.formError.set('No hay productos por reponer en ese almacén.');
          return;
        }
        this.lineas.clear();
        for (const x of s) this.lineas.push(this.nuevaLinea(x.producto_id, x.cantidad_sugerida, x.costo_unitario));
        const prov = s.find((x) => x.proveedor_id)?.proveedor_id;
        if (prov && this.form.controls.proveedor_id.value < 1) this.form.patchValue({ proveedor_id: prov });
        this.origen = 'AUTO';
        this.recalcular();
      },
      error: (err) => {
        this.cargandoSugeridos.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudieron cargar las sugerencias.'));
      },
    });
  }

  protected invalid(name: 'proveedor_id' | 'almacen_id' | 'moneda_id'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected lineaInvalida(i: number, name: string): boolean {
    const c = this.lineas.at(i).get(name)!;
    return c.invalid && (c.touched || this.submitted());
  }

  @HostListener('window:keydown.escape')
  protected cerrar(): void {
    if (this.saving() || this.procesando()) return;
    this.modalNueva.set(false);
    this.detalle.set(null);
  }

  protected guardar(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const ids = this.lineas.controls.map((g) => g.get('producto_id')!.value);
    if (new Set(ids).size !== ids.length) {
      this.formError.set('Hay productos repetidos. Suma sus cantidades en una sola línea.');
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set('');
    this.api
      .create({
        proveedor_id: v.proveedor_id,
        almacen_id: v.almacen_id,
        moneda_id: v.moneda_id,
        fecha_entrega_esperada: v.fecha_entrega_esperada || null,
        notas: v.notas.trim() || null,
        origen: this.origen,
        lineas: v.lineas,
      })
      .subscribe({
        next: (o) => {
          this.saving.set(false);
          this.modalNueva.set(false);
          this.showNotice('ok', `Orden ${o.orden.numero_orden} creada.`);
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(apiErrorMessage(err, 'No se pudo crear la orden.'));
        },
      });
  }

  // ===================== Detalle y recepción =====================

  protected abrir(o: OrdenResumen): void {
    this.detalleError.set('');
    this.api.get(o.orden_id).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.recibir.set(Object.fromEntries(d.lineas.map((l) => [l.detalle_id, l.cantidad_pedida - l.cantidad_recibida])));
      },
      error: (err) => this.showNotice('error', apiErrorMessage(err, 'No se pudo abrir la orden.')),
    });
  }

  protected puedeRecibir(d: OrdenDetalle): boolean {
    return d.orden.estado === 'PENDIENTE' || d.orden.estado === 'RECIBIDA_PARCIAL';
  }

  protected puedeCancelar(d: OrdenDetalle): boolean {
    return d.orden.estado === 'PENDIENTE' && d.lineas.every((l) => l.cantidad_recibida === 0);
  }

  protected pendiente(l: { cantidad_pedida: number; cantidad_recibida: number }): number {
    return l.cantidad_pedida - l.cantidad_recibida;
  }

  protected onRecibir(detalleId: number, e: Event): void {
    this.recibir.update((r) => ({ ...r, [detalleId]: Number((e.target as HTMLInputElement).value) }));
  }

  protected confirmarRecepcion(d: OrdenDetalle): void {
    const lineas = d.lineas
      .map((l) => ({ detalle_id: l.detalle_id, cantidad: this.recibir()[l.detalle_id] ?? 0, max: this.pendiente(l) }))
      .filter((l) => l.cantidad > 0);
    if (lineas.length === 0) {
      this.detalleError.set('Indica la cantidad que recibes en al menos una línea.');
      return;
    }
    if (lineas.some((l) => l.cantidad > l.max)) {
      this.detalleError.set('No puedes recibir más de lo pendiente en una línea.');
      return;
    }

    this.procesando.set(true);
    this.detalleError.set('');
    this.api.recibir(d.orden.orden_id, lineas.map(({ detalle_id, cantidad }) => ({ detalle_id, cantidad }))).subscribe({
      next: () => {
        this.procesando.set(false);
        this.detalle.set(null);
        this.showNotice('ok', 'Recepción registrada: el inventario fue actualizado.');
        this.load();
      },
      error: (err) => {
        this.procesando.set(false);
        this.detalleError.set(apiErrorMessage(err, 'No se pudo registrar la recepción.'));
      },
    });
  }

  protected cancelarOrden(d: OrdenDetalle): void {
    if (!confirm(`¿Cancelar la orden ${d.orden.numero_orden}?`)) return;
    this.procesando.set(true);
    this.detalleError.set('');
    this.api.cancelar(d.orden.orden_id).subscribe({
      next: () => {
        this.procesando.set(false);
        this.detalle.set(null);
        this.showNotice('ok', 'Orden cancelada.');
        this.load();
      },
      error: (err) => {
        this.procesando.set(false);
        this.detalleError.set(apiErrorMessage(err, 'No se pudo cancelar la orden.'));
      },
    });
  }

  private showNotice(kind: 'ok' | 'error', text: string): void {
    this.notice.set({ kind, text });
    setTimeout(() => this.notice.set(null), 5000);
  }
}
