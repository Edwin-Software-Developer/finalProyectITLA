import { Component, inject } from '@angular/core';
import { LucideMonitor, LucideMoon, LucideSun } from '@lucide/angular';
import { ModoTema, ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-apariencia-page',
  imports: [LucideMonitor, LucideMoon, LucideSun],
  styles: `
    .opciones { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; padding: 20px; }
    .opcion { display: flex; flex-direction: column; gap: 10px; padding: 14px; text-align: left; cursor: pointer; font: inherit; color: var(--ink);
      background: var(--surface); border: 2px solid var(--line); border-radius: 14px; }
    .opcion:hover { border-color: color-mix(in srgb, var(--blue) 50%, var(--line)); }
    .opcion[aria-checked='true'] { border-color: var(--blue); box-shadow: 0 0 0 3px color-mix(in srgb, var(--blue) 18%, transparent); }
    .titulo { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; }
    .ayuda { color: var(--muted); font-size: 12px; line-height: 1.4; }
    /* Miniaturas con colores fijos para que cada una muestre su tema sin importar el actual */
    .mini { height: 74px; border-radius: 8px; display: grid; grid-template-columns: 26% 1fr; overflow: hidden; border: 1px solid #8884; }
    .mini i { display: block; }
    .mini .cuerpo { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
    .mini .cuerpo b { display: block; height: 8px; border-radius: 4px; }
    .mini .cuerpo u { display: block; flex: 1; border-radius: 6px; }
    .mini-claro { background: #f7f8fb; } .mini-claro i { background: #111827; } .mini-claro b { background: #cbd5e1; } .mini-claro u { background: #fff; }
    .mini-oscuro { background: #0b1220; } .mini-oscuro i { background: #0a101c; } .mini-oscuro b { background: #26324b; } .mini-oscuro u { background: #121a2b; }
    .mini-sistema { background: linear-gradient(90deg, #f7f8fb 50%, #0b1220 50%); }
    .mini-sistema i { background: #1118278c; } .mini-sistema b { background: #8892a688; } .mini-sistema u { background: #8892a644; }
    .nota { padding: 0 20px 18px; color: var(--muted); font-size: 12px; }
  `,
  template: `
    <div class="dashboard-content mx-auto w-full">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span> CONFIGURACIÓN</div>
          <h1>Apariencia</h1>
          <p>Elige cómo se ve ControlStock. El cambio es inmediato y solo afecta a este navegador.</p>
        </div>
      </div>

      <section class="panel">
        <div class="opciones" role="radiogroup" aria-label="Tema de la aplicación">
          @for (o of opciones; track o.modo) {
            <button type="button" class="opcion" role="radio" [attr.aria-checked]="theme.modo() === o.modo" (click)="theme.cambiar(o.modo)">
              <span class="mini" [class]="'mini mini-' + o.modo" aria-hidden="true">
                <i></i>
                <span class="cuerpo"><b></b><u></u></span>
              </span>
              <span class="titulo">
                @switch (o.modo) {
                  @case ('claro') { <svg lucideSun [size]="16"></svg> }
                  @case ('oscuro') { <svg lucideMoon [size]="16"></svg> }
                  @default { <svg lucideMonitor [size]="16"></svg> }
                }
                {{ o.titulo }}
              </span>
              <span class="ayuda">{{ o.ayuda }}</span>
            </button>
          }
        </div>
        <p class="nota">
          Tema activo ahora: <strong>{{ theme.oscuro() ? 'oscuro' : 'claro' }}</strong>.
          La preferencia se guarda en este navegador, no en tu cuenta.
        </p>
      </section>
    </div>
  `,
})
export class AparienciaPage {
  protected readonly theme = inject(ThemeService);

  protected readonly opciones: { modo: ModoTema; titulo: string; ayuda: string }[] = [
    { modo: 'claro', titulo: 'Claro', ayuda: 'Fondo claro, ideal con mucha luz.' },
    { modo: 'oscuro', titulo: 'Oscuro', ayuda: 'Fondo oscuro, más cómodo de noche y con menos brillo.' },
    { modo: 'sistema', titulo: 'Automático', ayuda: 'Sigue el tema de tu sistema operativo y cambia con él.' },
  ];
}
