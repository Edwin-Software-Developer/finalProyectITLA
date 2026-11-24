import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideBadgePercent, LucideCoins, LucidePalette, LucideUserCog } from '@lucide/angular';

@Component({
  selector: 'app-configuracion-page',
  imports: [RouterLink, LucideArrowRight, LucideBadgePercent, LucideCoins, LucidePalette, LucideUserCog],
  template: `
    <div class="dashboard-content mx-auto w-full">
      <div class="page-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span> ADMINISTRACIÓN</div>
          <h1>Configuración</h1>
          <p>Parámetros generales del sistema.</p>
        </div>
      </div>

      <section class="panel quick-panel">
        <div class="quick-links">
          <a routerLink="/configuracion/monedas" class="quick-link">
            <span class="quick-link-icon quick-blue"><svg lucideCoins [size]="18"></svg></span>
            <span><strong>Monedas y tasas de cambio</strong><small>Moneda base, tasas y decimales</small></span>
            <svg lucideArrowRight [size]="16"></svg>
          </a>
          <a routerLink="/configuracion/impuestos" class="quick-link">
            <span class="quick-link-icon quick-amber"><svg lucideBadgePercent [size]="18"></svg></span>
            <span><strong>Impuestos</strong><small>ITBIS y otros porcentajes</small></span>
            <svg lucideArrowRight [size]="16"></svg>
          </a>
          <a routerLink="/configuracion/apariencia" class="quick-link">
            <span class="quick-link-icon quick-green"><svg lucidePalette [size]="18"></svg></span>
            <span><strong>Apariencia</strong><small>Tema claro, oscuro o automático</small></span>
            <svg lucideArrowRight [size]="16"></svg>
          </a>
          <a routerLink="/usuarios" class="quick-link">
            <span class="quick-link-icon quick-violet"><svg lucideUserCog [size]="18"></svg></span>
            <span><strong>Usuarios y roles</strong><small>Cuentas y permisos</small></span>
            <svg lucideArrowRight [size]="16"></svg>
          </a>
        </div>
      </section>
    </div>
  `,
})
export class ConfiguracionPage {}
