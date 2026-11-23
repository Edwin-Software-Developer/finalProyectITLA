import { DecimalPipe } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucidePencil, LucideRefreshCw, LucideX } from '@lucide/angular';
import { apiErrorMessage } from '../services/api';
import { AuthService } from '../services/auth.service';
import { EstadoStock, FilaInventario, InventarioService } from '../services/inventario.service';

type LoadState = 'loading' | 'ready' | 'error';

const ETIQUETA: Record<EstadoStock, string> = {
  critico: 'Crítico',
  bajo: 'Bajo mínimo',
  reponer: 'Reponer',
  sobrestock: 'Sobrestock',
  ok: 'Normal',
  sin_regla: 'Sin regla',
};

@Component({
  selector: 'app-reposicion-page',
  imports: [ReactiveFormsModule, DecimalPipe, LucidePencil, LucideRefreshCw, LucideX],
  templateUrl: './reposicion-page.html',
  // Misma apariencia de tabla/modal que Productos.
  styleUrl: './productos-page.css',
  styles: `
    .estado { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #eef2f7; color: #475569; }
    .estado-critico { background: #fee2e2; color: #b91c1c; }
    .estado-bajo { background: #ffedd5; color: #c2410c; }
    .estado-reponer { background: #fef3c7; color: #b45309; }
    .estado-sobrestock { background: #e0f2fe; color: #0369a1; }
    .estado-ok { background: #dcfce7; color: #15803d; }
    .regla small { display: block; }
    .hint { grid-column: 1 / -1; margin: 0; color: var(--muted); font-size: 13px; }
  `,
})
export class ReposicionPage implements OnInit {
  private readonly api = inject(InventarioService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly canWrite = inject(AuthService).canWrite;

  protected readonly filas = signal<FilaInventario[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly loadError = signal('');

  protected readonly search = signal('');
  protected readonly almacen = signal(0);
  protected readonly estado = signal<'' | EstadoStock | 'atencion'>('');

  protected readonly almacenes = computed(() => {
    const m = new Map<number, string>();
    for (const f of this.filas()) m.set(f.almacen_id, f.almacen);
    return [...m].map(([id, nombre]) => ({ id, nombre }));
  });

  protected readonly filtradas = computed(() => {
    const q = this.search().trim().toLowerCase();
    const a = this.almacen();
    const e = this.estado();
    return this.filas().filter(
      (f) =>
        (a === 0 || f.almacen_id === a) &&
        (e === '' || (e === 'atencion' ? ['critico', 'bajo', 'reponer'].includes(f.estado) : f.estado === e)) &&
        (!q || f.nombre.toLowerCase().includes(q) || f.sku.toLowerCase().includes(q)),
    );
  });

  protected readonly resumen = computed(() => {
    const c = (s: EstadoStock) => this.filas().filter((f) => f.estado === s).length;
    return { critico: c('critico'), bajo: c('bajo'), reponer: c('reponer'), sobrestock: c('sobrestock') };
  });

  protected readonly etiqueta = ETIQUETA;

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<FilaInventario | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly submitted = signal(false);
  protected readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  protected readonly form = this.fb.group({
    stock_minimo: [0, [Validators.required, Validators.min(0)]],
    stock_maximo: [0, [Validators.required, Validators.min(0)]],
    stock_seguridad: [0, [Validators.required, Validators.min(0)]],
    punto_reorden: [0, [Validators.required, Validators.min(0)]],
    pedido_automatico: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.api.list().subscribe({
      next: (data) => {
        this.filas.set(data);
        this.state.set('ready');
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, 'No se pudo cargar el inventario.'));
        this.state.set('error');
      },
    });
  }

  protected onSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
  }
  protected onAlmacen(e: Event): void {
    this.almacen.set(Number((e.target as HTMLSelectElement).value));
  }
  protected onEstado(e: Event): void {
    this.estado.set((e.target as HTMLSelectElement).value as '' | EstadoStock | 'atencion');
  }

  protected openEdit(f: FilaInventario): void {
    this.editing.set(f);
    this.form.reset({
      stock_minimo: f.stock_minimo ?? 0,
      stock_maximo: f.stock_maximo ?? 0,
      stock_seguridad: f.stock_seguridad ?? 0,
      punto_reorden: f.punto_reorden ?? 0,
      pedido_automatico: f.pedido_automatico ?? true,
    });
    this.formError.set('');
    this.submitted.set(false);
    this.modalOpen.set(true);
  }

  @HostListener('window:keydown.escape')
  protected closeModal(): void {
    if (!this.saving()) this.modalOpen.set(false);
  }

  protected invalid(c: 'stock_minimo' | 'stock_maximo' | 'stock_seguridad' | 'punto_reorden'): boolean {
    const ctrl = this.form.controls[c];
    return ctrl.invalid && (ctrl.touched || this.submitted());
  }

  /** Mismas reglas que valida el backend, para avisar antes de enviar. */
  private coherencia(): string {
    const v = this.form.getRawValue();
    if (v.stock_minimo > v.stock_maximo) return 'El stock mínimo no puede ser mayor que el máximo.';
    if (v.punto_reorden < v.stock_minimo || v.punto_reorden > v.stock_maximo)
      return 'El punto de reorden debe estar entre el stock mínimo y el máximo.';
    if (v.stock_seguridad > v.stock_minimo) return 'El stock de seguridad no puede superar al stock mínimo.';
    return '';
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const problema = this.coherencia();
    if (problema) {
      this.formError.set(problema);
      return;
    }

    const f = this.editing()!;
    this.saving.set(true);
    this.formError.set('');
    this.api
      .guardarRegla({ producto_id: f.producto_id, almacen_id: f.almacen_id, ...this.form.getRawValue() })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.modalOpen.set(false);
          this.showNotice('ok', 'Regla de reposición guardada.');
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(apiErrorMessage(err, 'No se pudo guardar la regla.'));
        },
      });
  }

  private showNotice(kind: 'ok' | 'error', text: string): void {
    this.notice.set({ kind, text });
    setTimeout(() => this.notice.set(null), 5000);
  }
}
