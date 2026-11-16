import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-placeholder-page',
  imports: [RouterLink],
  template: `
    <div class="dashboard-content mx-auto w-full">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span> EN CONSTRUCCIÓN</div>
          <h1>Este módulo aún no está disponible</h1>
          <p>La ruta <strong>{{ url }}</strong> todavía no tiene una pantalla asociada.</p>
        </div>
        <a class="primary-button" routerLink="/">Volver al dashboard</a>
      </div>
    </div>
  `,
})
export class PlaceholderPage {
  protected readonly url = inject(Router).url;
}
