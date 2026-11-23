import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { LucidePencil, LucidePlus, LucideRefreshCw, LucideTrash2, LucideX } from '@lucide/angular';
import { CatalogConfig, CatalogField } from '../data/catalog.configs';
import { apiErrorMessage } from '../services/api';
import { AuthService } from '../services/auth.service';
import { CatalogRow, CatalogService } from '../services/catalog.service';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Pantalla CRUD reutilizable para catálogos simples (almacenes, proveedores, clientes).
 * La configuración llega por `data: { catalog }` en la ruta.
 */
@Component({
  selector: 'app-catalog-page',
  imports: [ReactiveFormsModule, LucidePencil, LucidePlus, LucideRefreshCw, LucideTrash2, LucideX],
  templateUrl: './catalog-page.html',
  // Misma apariencia de tabla/modal que Productos.
  styleUrl: './productos-page.css',
})
export class CatalogPage implements OnInit {
  private readonly api = inject(CatalogService);
  private readonly auth = inject(AuthService);
  protected readonly cfg = inject(ActivatedRoute).snapshot.data['catalog'] as CatalogConfig;

  protected readonly canWrite = this.auth.canWrite;
  protected readonly isAdmin = this.auth.isAdmin;

  protected readonly rows = signal<CatalogRow[]>([]);
  protected readonly state = signal<LoadState>('loading');
  protected readonly loadError = signal('');
  protected readonly search = signal('');

  protected readonly columns = this.cfg.fields.filter((f) => f.column !== false);

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((r) =>
      this.cfg.fields.some((f) => String(r[f.key] ?? '').toLowerCase().includes(q)),
    );
  });

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<CatalogRow | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly submitted = signal(false);
  protected readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  protected readonly form = new FormGroup<Record<string, FormControl>>({});

  ngOnInit(): void {
    for (const f of this.cfg.fields) {
      const validators = [];
      if (f.type === 'number') {
        validators.push(Validators.required);
        if (f.min !== undefined) validators.push(Validators.min(f.min));
        if (f.max !== undefined) validators.push(Validators.max(f.max));
      } else if (f.type !== 'bool') {
        if (f.max !== undefined) validators.push(Validators.maxLength(f.max));
        if (f.required) validators.push(Validators.required);
        if (f.type === 'email') validators.push(Validators.email);
      }
      const initial = f.type === 'bool' ? false : f.type === 'number' ? (f.min ?? 0) : '';
      this.form.addControl(f.key, new FormControl(initial, { nonNullable: true, validators }));
    }
    if (this.cfg.hasActivo) this.form.addControl('activo', new FormControl(true, { nonNullable: true }));
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.api.list(this.cfg.endpoint).subscribe({
      next: (data) => {
        this.rows.set(data);
        this.state.set('ready');
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, `No se pudo cargar ${this.cfg.title.toLowerCase()}.`));
        this.state.set('error');
      },
    });
  }

  protected id(row: CatalogRow): number {
    return Number(row[this.cfg.idKey]);
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset(Object.fromEntries(this.cfg.fields.map((f) => [f.key, this.valorInicial(f)])));
    if (this.cfg.hasActivo) this.form.controls['activo'].setValue(true);
    this.openModal();
  }

  protected openEdit(row: CatalogRow): void {
    this.editing.set(row);
    const value: Record<string, unknown> = {};
    for (const f of this.cfg.fields) value[f.key] = row[f.key] ?? this.valorInicial(f);
    if (this.cfg.hasActivo) value['activo'] = row['activo'] ?? true;
    this.form.reset(value);
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

  protected invalid(key: string): boolean {
    const c = this.form.controls[key];
    return c.invalid && (c.touched || this.submitted());
  }

  protected errorText(key: string, label: string): string {
    const c = this.form.controls[key];
    if (c.hasError('required')) return `${label} es requerido.`;
    if (c.hasError('email')) return 'Ingresa un correo válido.';
    if (c.hasError('min')) return `Debe ser mayor o igual a ${c.getError('min').min}.`;
    if (c.hasError('max')) return `Debe ser menor o igual a ${c.getError('max').max}.`;
    if (c.hasError('maxlength')) return `Máximo ${c.getError('maxlength').requiredLength} caracteres.`;
    return '';
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Los campos opcionales vacíos se envían como null.
    const body: CatalogRow = {};
    for (const f of this.cfg.fields) {
      const raw = this.form.controls[f.key].value;
      if (f.type === 'bool') body[f.key] = !!raw;
      else if (f.type === 'number') body[f.key] = Number(raw);
      else {
        const v = String(raw ?? '').trim();
        body[f.key] = v === '' && !f.required ? null : v;
      }
    }
    if (this.cfg.hasActivo) body['activo'] = this.form.controls['activo'].value;

    const current = this.editing();
    this.saving.set(true);
    this.formError.set('');
    const request: Observable<unknown> = current
      ? this.api.update(this.cfg.endpoint, this.id(current), body)
      : this.api.create(this.cfg.endpoint, body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.showNotice('ok', current ? 'Cambios guardados.' : `${this.capitalize(this.cfg.singular)} creado.`);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err, 'No se pudo guardar.'));
      },
    });
  }

  protected remove(row: CatalogRow): void {
    const nombre = String(row['nombre'] ?? '');
    if (!confirm(`¿Eliminar ${this.cfg.singular} "${nombre}"? Esta acción no se puede deshacer.`)) return;
    this.api.delete(this.cfg.endpoint, this.id(row)).subscribe({
      next: () => {
        this.showNotice('ok', `${this.capitalize(this.cfg.singular)} eliminado.`);
        this.load();
      },
      error: (err) => this.showNotice('error', apiErrorMessage(err, 'No se pudo eliminar.')),
    });
  }

  private valorInicial(f: CatalogField): string | number | boolean {
    return f.type === 'bool' ? false : f.type === 'number' ? (f.min ?? 0) : '';
  }

  /** Texto de una celda: Sí/No para booleanos. */
  protected celda(row: CatalogRow, f: CatalogField): string {
    const v = row[f.key];
    if (f.type === 'bool') return v ? 'Sí' : 'No';
    return v === null || v === undefined || v === '' ? '—' : String(v);
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private showNotice(kind: 'ok' | 'error', text: string): void {
    this.notice.set({ kind, text });
    setTimeout(() => this.notice.set(null), 5000);
  }
}
