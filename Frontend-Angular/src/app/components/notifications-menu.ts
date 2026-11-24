import { Component, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideBell } from '@lucide/angular';
import { AlertaInventario, DashboardService } from '../services/dashboard.service';

/** Campana de la barra superior: alertas reales de stock bajo (mismas del dashboard). */
@Component({
  selector: 'app-notifications-menu',
  imports: [LucideBell],
  styles: `
    :host { position: relative; display: block; }
    .menu { position: absolute; right: 0; top: calc(100% + 8px); width: 330px; max-width: 92vw; z-index: 60; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 10px 30px rgb(15 23 42 / 12%); overflow: hidden; }
    .head { padding: 12px 14px; font-weight: 700; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; }
    .head span { color: var(--muted); font-weight: 500; }
    .item { display: flex; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--line); align-items: center; }
    .punto { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
    .red { background: #dc2626; } .orange { background: #f59e0b; }
    .item strong { display: block; font-size: 13px; }
    .item small { color: var(--muted); font-size: 12px; }
    .cant { margin-left: auto; text-align: right; font-size: 12px; color: var(--muted); }
    .cant strong { color: var(--ink); }
    .vacio { padding: 18px 14px; text-align: center; color: var(--muted); font-size: 13px; }
    .pie { display: block; width: 100%; padding: 11px; border: 0; background: var(--surface-2); color: var(--blue); font: inherit; font-weight: 600; cursor: pointer; }
  `,
  template: `
    <button
      type="button"
      aria-label="Notificaciones"
      class="icon-button notification-button"
      aria-haspopup="true"
      [attr.aria-expanded]="abierto()"
      (click)="alternar()"
    >
      <svg lucideBell [size]="18"></svg>
      @if (total() > 0) {
        <span class="notification-dot"></span>
      }
    </button>

    @if (abierto()) {
      <div class="menu" role="menu">
        <div class="head">Alertas de inventario <span>{{ total() }}</span></div>
        @if (error()) {
          <div class="vacio">No se pudieron cargar las alertas.</div>
        } @else if (alertas().length === 0) {
          <div class="vacio">{{ cargado() ? 'Todo en orden: no hay productos bajo el mínimo.' : 'Cargando…' }}</div>
        } @else {
          @for (a of alertas(); track a.nombre + a.detalle) {
            <div class="item">
              <span class="punto" [class]="'punto ' + a.nivel"></span>
              <span><strong>{{ a.nombre }}</strong><small>{{ a.detalle }}</small></span>
              <span class="cant"><strong>{{ a.cantidad }}</strong><br />mín. {{ a.minimo }}</span>
            </div>
          }
        }
        <button type="button" class="pie" (click)="irReposicion()">Ver reposición</button>
      </div>
    }
  `,
})
export class NotificationsMenu implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly abierto = signal(false);
  protected readonly alertas = signal<AlertaInventario[]>([]);
  protected readonly total = signal(0);
  protected readonly cargado = signal(false);
  protected readonly error = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.api.getResumen().subscribe({
      next: (r) => {
        this.alertas.set(r.alertas);
        this.total.set(r.totalAlertas);
        this.error.set(false);
        this.cargado.set(true);
      },
      error: () => {
        this.error.set(true);
        this.cargado.set(true);
      },
    });
  }

  protected alternar(): void {
    const abrir = !this.abierto();
    this.abierto.set(abrir);
    if (abrir) this.cargar(); // datos frescos cada vez que se abre
  }

  protected irReposicion(): void {
    this.abierto.set(false);
    void this.router.navigateByUrl('/inventario/reposicion');
  }

  @HostListener('document:click', ['$event'])
  protected fuera(e: Event): void {
    if (this.abierto() && !this.host.nativeElement.contains(e.target as Node)) this.abierto.set(false);
  }

  @HostListener('window:keydown.escape')
  protected escape(): void {
    this.abierto.set(false);
  }
}
