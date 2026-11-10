import { DecimalPipe } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { Observable } from 'rxjs';
import { apiErrorMessage } from '../services/api';
import {
  OpcionCatalogo,
  Producto,
  ProductoForm,
  ProductosService,
} from '../services/productos.service';

type LoadState = 'loading' | 'ready' | 'error';
type StatusFilter = 'todos' | 'activos' | 'inactivos';

@Component({
  selector: 'app-productos-page',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideTrash2,
    LucideX,
  ],
  templateUrl: './productos-page.html',
  styleUrl: './productos-page.css',
})
export class ProductosPage implements OnInit {
  private readonly api = inject(ProductosService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly unidades = ['Unidad', 'Libra', 'Litro', 'Paquete', 'Caja', 'Kilogramo'];

  // Listado
  protected readonly productos = signal<Producto[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly loadError = signal('');
  protected readonly search = signal('');
  protected readonly status = signal<StatusFilter>('todos');
  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.status();
    return this.productos().filter((p) => {
      if (status === 'activos' && !p.activo) return false;
      if (status === 'inactivos' && p.activo) return false;
      return !term || p.nombre.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
    });
  });

  // Catálogos del formulario (vienen de la API)
  protected readonly categorias = signal<OpcionCatalogo[]>([]);
  protected readonly impuestos = signal<OpcionCatalogo[]>([]);

  // Formulario (modal)
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Producto | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly submitted = signal(false);

  // Eliminación / mensajes
  protected readonly deletingId = signal<number | null>(null);
  protected readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  protected readonly form = this.fb.group({
    sku: ['', [Validators.required, Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    categoria_id: [0, [Validators.min(1)]],
    impuesto_id: [0, [Validators.min(1)]],
    unidad_medida: ['Unidad', [Validators.required, Validators.maxLength(20)]],
    costo_unitario: [0, [Validators.required, Validators.min(0)]],
    precio_venta: [0, [Validators.required, Validators.min(0)]],
    activo: [true],
  });

  ngOnInit(): void {
    this.load();
    this.api.categorias().subscribe({ next: (c) => this.categorias.set(c) });
    this.api.impuestos().subscribe({ next: (i) => this.impuestos.set(i) });
  }

  protected load(): void {
    this.state.set('loading');
    this.api.list().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.state.set('ready');
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, 'No se pudieron cargar los productos.'));
        this.state.set('error');
      },
    });
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  // ---- Crear / editar ----
  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      sku: '',
      nombre: '',
      categoria_id: 0,
      impuesto_id: 0,
      unidad_medida: 'Unidad',
      costo_unitario: 0,
      precio_venta: 0,
      activo: true,
    });
    this.openModal();
  }

  protected openEdit(producto: Producto): void {
    this.editing.set(producto);
    this.form.reset({
      sku: producto.sku,
      nombre: producto.nombre,
      categoria_id: producto.categoria_id,
      impuesto_id: producto.impuesto_id,
      unidad_medida: producto.unidad_medida,
      costo_unitario: producto.costo_unitario,
      precio_venta: producto.precio_venta,
      activo: producto.activo,
    });
    this.openModal();
  }

  private openModal(): void {
    this.formError.set('');
    this.submitted.set(false);
    this.modalOpen.set(true);
  }

  @HostListener('window:keydown.escape')
  protected closeModal(): void {
    if (!this.saving()) this.modalOpen.set(false);
  }

  protected invalid(control: keyof ProductoForm): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || this.submitted());
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const body: ProductoForm = {
      ...this.form.getRawValue(),
      sku: this.form.controls.sku.value.trim(),
      nombre: this.form.controls.nombre.value.trim(),
    };
    const current = this.editing();

    this.saving.set(true);
    this.formError.set('');
    const request: Observable<unknown> = current
      ? this.api.update(current.producto_id, body)
      : this.api.create(body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.showNotice('ok', current ? 'Producto actualizado.' : 'Producto creado.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo guardar el producto.'));
      },
    });
  }

  // ---- Eliminar ----
  protected remove(producto: Producto): void {
    if (!confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;

    this.deletingId.set(producto.producto_id);
    this.api.delete(producto.producto_id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.showNotice('ok', 'Producto eliminado.');
        this.load();
      },
      error: (err) => {
        this.deletingId.set(null);
        this.showNotice('error', apiErrorMessage(err, 'No se pudo eliminar el producto.'));
      },
    });
  }

  private showNotice(kind: 'ok' | 'error', text: string): void {
    this.notice.set({ kind, text });
    setTimeout(() => this.notice.set(null), 5000);
  }
}
