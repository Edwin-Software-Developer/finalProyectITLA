import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideCommand, LucideSearch } from '@lucide/angular';
import { navigationGroups } from '../data/dashboard.data';
import { AuthService } from '../services/auth.service';
import { Producto, ProductosService } from '../services/productos.service';

interface Resultado {
  tipo: 'Página' | 'Producto';
  titulo: string;
  detalle: string;
  /** Acción al elegirlo. */
  ir: () => void;
}

/** Búsqueda global de la barra superior (Ctrl+K): páginas del menú y productos. */
@Component({
  selector: 'app-global-search',
  imports: [LucideSearch, LucideCommand],
  styles: `
    :host { position: relative; display: block; }
    .panel-resultados {
      position: absolute; top: calc(100% + 8px); left: 0; width: 340px; max-width: 90vw; z-index: 60;
      background: var(--surface); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 10px 30px rgb(15 23 42 / 12%);
      padding: 6px; max-height: 360px; overflow: auto;
    }
    .resultado { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; background: none; border-radius: 8px; cursor: pointer; text-align: left; font: inherit; color: var(--ink); }
    .resultado.activo, .resultado:hover { background: color-mix(in srgb, #f1f5ff var(--tint), var(--surface)); }
    .resultado strong { display: block; font-size: 13px; }
    .resultado small { color: var(--muted); font-size: 12px; }
    .etiqueta { margin-left: auto; font-size: 10px; font-weight: 700; text-transform: uppercase; color: color-mix(in srgb, #64748b, white var(--lift)); background: color-mix(in srgb, #eef2f7 var(--tint), var(--surface)); padding: 2px 6px; border-radius: 999px; }
    .nada { padding: 14px; text-align: center; color: var(--muted); font-size: 13px; }
  `,
  template: `
    <label class="search-box" [class.search-box-open]="abierto()">
      <svg lucideSearch [size]="17"></svg>
      <input
        id="global-search"
        placeholder="Buscar páginas o productos…"
        type="search"
        autocomplete="off"
        aria-label="Búsqueda global"
        [value]="termino()"
        (focus)="enfocar()"
        (blur)="abierto.set(false)"
        (input)="onInput($event)"
        (keydown.enter)="elegir(resultados()[indice()])"
        (keydown.arrowdown)="mover(1, $event)"
        (keydown.arrowup)="mover(-1, $event)"
      />
      <kbd><svg lucideCommand [size]="11"></svg> K</kbd>
    </label>

    @if (abierto() && termino().trim()) {
      <!-- mousedown evita que el input pierda el foco antes del clic -->
      <div class="panel-resultados" role="listbox" (mousedown)="$event.preventDefault()">
        @for (r of resultados(); track $index; let i = $index) {
          <button type="button" class="resultado" role="option" [class.activo]="i === indice()" (click)="elegir(r)">
            <span><strong>{{ r.titulo }}</strong><small>{{ r.detalle }}</small></span>
            <span class="etiqueta">{{ r.tipo }}</span>
          </button>
        } @empty {
          <div class="nada">{{ cargando() ? 'Buscando…' : 'Sin resultados.' }}</div>
        }
      </div>
    }
  `,
})
export class GlobalSearch {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly productosApi = inject(ProductosService);

  protected readonly abierto = signal(false);
  protected readonly termino = signal('');
  protected readonly indice = signal(0);
  protected readonly cargando = signal(false);
  private readonly productos = signal<Producto[]>([]);
  private cargados = false;

  protected readonly resultados = computed<Resultado[]>(() => {
    const q = this.termino().trim().toLowerCase();
    if (!q) return [];
    const rol = this.auth.user()?.rol;

    const paginas: Resultado[] = navigationGroups
      .flatMap((g) => g.items.map((i) => ({ ...i, grupo: g.label })))
      .filter((i) => (!i.roles || (rol && i.roles.includes(rol))) && i.label.toLowerCase().includes(q))
      .slice(0, 5)
      .map((i) => ({ tipo: 'Página', titulo: i.label, detalle: i.grupo, ir: () => void this.router.navigateByUrl(i.href) }));

    const productos: Resultado[] = this.productos()
      .filter((p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        tipo: 'Producto',
        titulo: p.nombre,
        detalle: `${p.sku} · ${p.categoria}`,
        ir: () => void this.router.navigate(['/productos'], { queryParams: { q: p.sku } }),
      }));

    return [...paginas, ...productos];
  });

  protected enfocar(): void {
    this.abierto.set(true);
    if (this.cargados) return;
    this.cargados = true;
    this.cargando.set(true);
    this.productosApi.list().subscribe({
      next: (p) => {
        this.productos.set(p);
        this.cargando.set(false);
      },
      error: () => {
        this.cargados = false; // reintenta la próxima vez que se abra
        this.cargando.set(false);
      },
    });
  }

  protected onInput(e: Event): void {
    this.termino.set((e.target as HTMLInputElement).value);
    this.indice.set(0);
    this.abierto.set(true);
  }

  protected mover(delta: number, e: Event): void {
    e.preventDefault();
    const n = this.resultados().length;
    if (n > 0) this.indice.set((this.indice() + delta + n) % n);
  }

  protected elegir(r: Resultado | undefined): void {
    if (!r) return;
    r.ir();
    this.termino.set('');
    this.abierto.set(false);
    (document.getElementById('global-search') as HTMLInputElement | null)?.blur();
  }

  @HostListener('window:keydown', ['$event'])
  protected atajos(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('global-search')?.focus();
    } else if (e.key === 'Escape' && this.abierto()) {
      this.abierto.set(false);
      (document.getElementById('global-search') as HTMLInputElement | null)?.blur();
    }
  }
}
