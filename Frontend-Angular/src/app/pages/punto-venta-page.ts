import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { LucideMinus, LucidePlus, LucideShoppingCart, LucideTrash2 } from '@lucide/angular';
import { apiErrorMessage } from '../services/api';
import { CatalogService } from '../services/catalog.service';
import { ProductoPos, VentasService } from '../services/ventas.service';

interface ItemCarrito {
  producto: ProductoPos;
  cantidad: number;
  descuento: number;
}

@Component({
  selector: 'app-punto-venta-page',
  imports: [DecimalPipe, LucideMinus, LucidePlus, LucideShoppingCart, LucideTrash2],
  templateUrl: './punto-venta-page.html',
  styleUrl: './punto-venta-page.css',
})
export class PuntoVentaPage implements OnInit {
  private readonly api = inject(VentasService);
  private readonly catalogApi = inject(CatalogService);
  private readonly buscador = viewChild<ElementRef<HTMLInputElement>>('buscador');

  protected readonly almacenes = signal<{ id: number; nombre: string }[]>([]);
  protected readonly clientes = signal<{ id: number; nombre: string }[]>([]);
  protected readonly almacenId = signal(0);
  protected readonly clienteId = signal(0);

  protected readonly catalogo = signal<ProductoPos[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal('');
  protected readonly busqueda = signal('');

  protected readonly carrito = signal<ItemCarrito[]>([]);
  protected readonly cobrando = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');

  protected readonly visibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.catalogo().filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  });

  /** Totales con la misma fórmula que el servidor (el servidor es quien manda al guardar). */
  protected readonly lineas = computed(() =>
    this.carrito().map((i) => {
      const bruto = i.cantidad * i.producto.precio_venta;
      const descuento = round2((bruto * i.descuento) / 100);
      const subtotal = round2(bruto - descuento);
      const iva = round2((subtotal * i.producto.porcentaje_impuesto) / 100);
      return { ...i, descuentoMonto: descuento, subtotal, iva, total: subtotal + iva };
    }),
  );
  protected readonly subtotal = computed(() => this.lineas().reduce((a, l) => a + l.subtotal, 0));
  protected readonly impuestos = computed(() => this.lineas().reduce((a, l) => a + l.iva, 0));
  protected readonly total = computed(() => this.subtotal() + this.impuestos());
  protected readonly unidades = computed(() => this.carrito().reduce((a, i) => a + i.cantidad, 0));

  ngOnInit(): void {
    this.catalogApi.list('almacenes').subscribe({
      next: (r) => {
        const alm = r.map((x) => ({ id: Number(x['almacen_id']), nombre: String(x['nombre']) }));
        this.almacenes.set(alm);
        if (alm.length > 0) this.cambiarAlmacen(alm[0].id);
      },
      error: (err) => this.errorCarga.set(apiErrorMessage(err, 'No se pudieron cargar los almacenes.')),
    });
    this.catalogApi.list('clientes').subscribe({
      next: (r) =>
        this.clientes.set(r.filter((x) => x['activo']).map((x) => ({ id: Number(x['cliente_id']), nombre: String(x['nombre']) }))),
    });
  }

  /** F2 enfoca el buscador (atajo que anuncia el dashboard). */
  @HostListener('window:keydown.f2', ['$event'])
  protected enfocarBuscador(e: Event): void {
    e.preventDefault();
    this.buscador()?.nativeElement.focus();
  }

  protected onAlmacen(e: Event): void {
    const id = Number((e.target as HTMLSelectElement).value);
    if (this.carrito().length > 0 && !confirm('Cambiar de almacén vacía el carrito. ¿Continuar?')) {
      (e.target as HTMLSelectElement).value = String(this.almacenId());
      return;
    }
    this.carrito.set([]);
    this.cambiarAlmacen(id);
  }

  private cambiarAlmacen(id: number): void {
    this.almacenId.set(id);
    this.recargarCatalogo();
  }

  private recargarCatalogo(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.api.catalogo(this.almacenId()).subscribe({
      next: (c) => {
        this.catalogo.set(c);
        this.cargando.set(false);
      },
      error: (err) => {
        this.errorCarga.set(apiErrorMessage(err, 'No se pudo cargar el catálogo.'));
        this.cargando.set(false);
      },
    });
  }

  protected onBuscar(e: Event): void {
    this.busqueda.set((e.target as HTMLInputElement).value);
  }

  /** Enter en el buscador: agrega el producto si el resultado es único (o coincide exactamente con un SKU). */
  protected enterBuscador(): void {
    const q = this.busqueda().trim().toLowerCase();
    const v = this.visibles();
    const exacto = v.find((p) => p.sku.toLowerCase() === q);
    const elegido = exacto ?? (v.length === 1 ? v[0] : undefined);
    if (elegido) {
      this.agregar(elegido);
      this.busqueda.set('');
      const el = this.buscador()?.nativeElement;
      if (el) el.value = '';
    }
  }

  protected enCarrito(p: ProductoPos): number {
    return this.carrito().find((i) => i.producto.producto_id === p.producto_id)?.cantidad ?? 0;
  }

  protected agregar(p: ProductoPos): void {
    this.aviso.set('');
    const actual = this.enCarrito(p);
    if (actual + 1 > p.disponible) {
      this.aviso.set(`${p.nombre}: solo hay ${p.disponible} disponibles.`);
      return;
    }
    this.carrito.update((c) =>
      actual === 0
        ? [...c, { producto: p, cantidad: 1, descuento: 0 }]
        : c.map((i) => (i.producto.producto_id === p.producto_id ? { ...i, cantidad: i.cantidad + 1 } : i)),
    );
  }

  protected cambiarCantidad(i: ItemCarrito, valor: number): void {
    this.aviso.set('');
    if (!(valor > 0)) return;
    const cantidad = Math.min(valor, i.producto.disponible);
    if (valor > i.producto.disponible) this.aviso.set(`${i.producto.nombre}: solo hay ${i.producto.disponible} disponibles.`);
    this.carrito.update((c) => c.map((x) => (x === i ? { ...x, cantidad } : x)));
  }

  protected sumar(i: ItemCarrito, delta: number): void {
    if (i.cantidad + delta <= 0) {
      this.quitar(i);
      return;
    }
    this.cambiarCantidad(i, i.cantidad + delta);
  }

  protected cambiarDescuento(i: ItemCarrito, valor: number): void {
    const descuento = Math.min(100, Math.max(0, Number.isFinite(valor) ? valor : 0));
    this.carrito.update((c) => c.map((x) => (x === i ? { ...x, descuento } : x)));
  }

  protected quitar(i: ItemCarrito): void {
    this.carrito.update((c) => c.filter((x) => x !== i));
  }

  protected vaciar(): void {
    this.carrito.set([]);
    this.aviso.set('');
    this.error.set('');
  }

  protected num(e: Event): number {
    return Number((e.target as HTMLInputElement).value);
  }

  protected onCliente(e: Event): void {
    this.clienteId.set(Number((e.target as HTMLSelectElement).value));
  }

  protected cobrar(): void {
    if (this.carrito().length === 0 || this.cobrando()) return;
    this.cobrando.set(true);
    this.error.set('');
    this.aviso.set('');
    this.api
      .create({
        almacen_id: this.almacenId(),
        cliente_id: this.clienteId() || null,
        notas: null,
        lineas: this.carrito().map((i) => ({
          producto_id: i.producto.producto_id,
          cantidad: i.cantidad,
          descuento_porcentaje: i.descuento,
        })),
      })
      .subscribe({
        next: (v) => {
          this.cobrando.set(false);
          this.carrito.set([]);
          this.aviso.set(`Venta ${v.venta.numero_factura} registrada por ${v.venta.moneda_simbolo} ${round2(v.venta.total).toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`);
          this.recargarCatalogo(); // refresca las existencias disponibles
        },
        error: (err) => {
          this.cobrando.set(false);
          this.error.set(apiErrorMessage(err, 'No se pudo registrar la venta.'));
          this.recargarCatalogo();
        },
      });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
