import { DecimalPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { LucideDownload, LucideSparkles } from '@lucide/angular';
import { apiErrorMessage } from '../services/api';
import { InformeInventario, ReportesService } from '../services/reportes.service';

type Estado = 'vacio' | 'generando' | 'listo' | 'error';

@Component({
  selector: 'app-informe-inventario-page',
  imports: [DecimalPipe, DatePipe, LucideDownload, LucideSparkles],
  template: `
    <div class="dashboard-content mx-auto w-full">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span> INTELIGENCIA ARTIFICIAL</div>
          <h1>Informe de inventario</h1>
          <p>La IA analiza las cifras reales del inventario y redacta hallazgos y recomendaciones.</p>
        </div>
        <div class="acciones">
          @if (informe(); as inf) {
            <button class="secondary-button" [disabled]="descargando()" (click)="descargar(inf)">
              <svg lucideDownload [size]="16" [strokeWidth]="2.3"></svg>
              {{ descargando() ? 'Generando PDF…' : 'Descargar PDF' }}
            </button>
          }
          <button class="primary-button" [disabled]="estado() === 'generando'" (click)="generar()">
            <svg lucideSparkles [size]="17" [strokeWidth]="2.3"></svg>
            {{ estado() === 'generando' ? 'Generando…' : informe() ? 'Regenerar' : 'Generar informe' }}
          </button>
        </div>
      </div>

      @if (aviso(); as a) {
        <div class="notice notice-error" role="alert">{{ a }}</div>
      }

      @switch (estado()) {
        @case ('vacio') {
          <section class="panel estado-vacio">
            <p>Pulsa <strong>Generar informe</strong> para crear el análisis con la información actual.</p>
          </section>
        }
        @case ('generando') {
          <section class="panel estado-vacio" role="status">
            <p>La IA está redactando el informe. Puede tardar hasta un minuto…</p>
          </section>
        }
        @case ('error') {
          <section class="panel estado-vacio" role="alert">
            <p>{{ error() }}</p>
          </section>
        }
        @case ('listo') {
          @if (informe(); as inf) {
            @if (inf.simulado) {
              <div class="notice">
                Contenido simulado: el backend no tiene configurado el token de Replicate, así que el texto no lo redactó una IA.
              </div>
            }

            <section class="panel informe">
              <h2>{{ inf.informe.titulo }}</h2>
              <small class="meta">
                {{ inf.generadoEn | date: 'dd/MM/yyyy HH:mm' }} ·
                {{ inf.simulado ? 'simulado' : 'modelo ' + inf.modelo }}
              </small>

              <div class="kpis">
                <div><span>Productos activos</span><strong>{{ inf.datos.kpis.productosActivos | number }}</strong></div>
                <div><span>Unidades en stock</span><strong>{{ inf.datos.kpis.unidadesEnStock | number: '1.0-0' }}</strong></div>
                <div><span>Valor a costo</span><strong>{{ inf.datos.kpis.valorInventarioCosto | number: '1.2-2' }}</strong></div>
                <div><span>Bajo mínimo</span><strong class="rojo">{{ inf.datos.kpis.productosBajoMinimo }}</strong></div>
                <div><span>Sobrestock</span><strong class="naranja">{{ inf.datos.kpis.productosSobrestock }}</strong></div>
              </div>

              <h3>Resumen ejecutivo</h3>
              <p class="texto">{{ inf.informe.resumen_ejecutivo }}</p>

              <h3>Hallazgos</h3>
              <ul class="lista">
                @for (h of inf.informe.hallazgos; track $index) {
                  <li>
                    <span class="tag" [class]="'tag tag-' + h.tipo">{{ h.tipo }}</span>
                    @if (h.producto) {
                      <strong>{{ h.producto }}: </strong>
                    }
                    {{ h.detalle }}
                  </li>
                }
              </ul>

              <h3>Recomendaciones</h3>
              <ol class="lista">
                @for (r of inf.informe.recomendaciones; track $index) {
                  <li>
                    <span class="tag" [class]="'tag tag-' + r.prioridad">{{ r.prioridad }}</span>
                    {{ r.accion }}
                  </li>
                }
              </ol>
            </section>
          }
        }
      }
    </div>
  `,
  styles: `
    .acciones { display: flex; gap: 10px; flex-wrap: wrap; }
    .secondary-button {
      display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 16px;
      border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink);
      font-weight: 600; cursor: pointer;
    }
    .secondary-button:hover:not(:disabled) { background: var(--surface-2); }
    button:disabled { opacity: 0.6; cursor: progress; }
    .notice { margin-bottom: 14px; padding: 12px 16px; border-radius: 10px; background: color-mix(in srgb, #eef4ff var(--tint), var(--surface)); color: color-mix(in srgb, #1e3a8a, white var(--lift)); font-size: 14px; }
    .notice-error { background: color-mix(in srgb, #fef2f2 var(--tint), var(--surface)); color: color-mix(in srgb, #991b1b, white var(--lift)); }
    .estado-vacio { padding: 40px 24px; text-align: center; color: var(--muted); }
    .informe { padding: 24px; }
    .informe h2 { margin: 0; font-size: 22px; color: var(--ink); }
    .informe h3 { margin: 24px 0 8px; font-size: 15px; color: var(--ink); }
    .meta { color: var(--muted); }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 18px; }
    .kpis div { border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
    .kpis span { font-size: 12px; color: var(--muted); }
    .kpis strong { font-size: 20px; color: var(--ink); }
    .kpis .rojo { color: color-mix(in srgb, #dc2626, white var(--lift)); }
    .kpis .naranja { color: color-mix(in srgb, #d97706, white var(--lift)); }
    .texto { line-height: 1.6; color: var(--ink); margin: 0; }
    .lista { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; line-height: 1.5; color: var(--ink); }
    .tag { display: inline-block; margin-right: 6px; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: color-mix(in srgb, #eef2f7 var(--tint), var(--surface)); color: color-mix(in srgb, #475569, white var(--lift)); }
    .tag-quiebre, .tag-alta { background: color-mix(in srgb, #fee2e2 var(--tint), var(--surface)); color: color-mix(in srgb, #b91c1c, white var(--lift)); }
    .tag-sobrestock, .tag-media { background: color-mix(in srgb, #fef3c7 var(--tint), var(--surface)); color: color-mix(in srgb, #b45309, white var(--lift)); }
    .tag-rotacion { background: color-mix(in srgb, #e0f2fe var(--tint), var(--surface)); color: color-mix(in srgb, #0369a1, white var(--lift)); }
    .tag-baja { background: color-mix(in srgb, #dcfce7 var(--tint), var(--surface)); color: color-mix(in srgb, #15803d, white var(--lift)); }
  `,
})
export class InformeInventarioPage {
  private readonly api = inject(ReportesService);

  protected readonly estado = signal<Estado>('vacio');
  protected readonly informe = signal<InformeInventario | null>(null);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly descargando = signal(false);

  protected generar(): void {
    this.estado.set('generando');
    this.aviso.set('');
    this.api.generarInventario().subscribe({
      next: (inf) => {
        this.informe.set(inf);
        this.estado.set('listo');
      },
      error: (err) => {
        const msg =
          err?.status === 429
            ? 'Demasiados informes seguidos. Espera un minuto e inténtalo de nuevo.'
            : apiErrorMessage(err, 'No se pudo generar el informe.');
        // Si ya había un informe, se conserva y el error se muestra como aviso.
        if (this.informe()) {
          this.aviso.set(msg);
          this.estado.set('listo');
        } else {
          this.error.set(msg);
          this.estado.set('error');
        }
      },
    });
  }

  protected descargar(inf: InformeInventario): void {
    this.descargando.set(true);
    this.aviso.set('');
    this.api.descargarPdf(inf).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-inventario-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.descargando.set(false);
      },
      error: (err) => {
        this.aviso.set(apiErrorMessage(err, 'No se pudo generar el PDF.'));
        this.descargando.set(false);
      },
    });
  }
}
