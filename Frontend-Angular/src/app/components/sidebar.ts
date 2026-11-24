import { Component, computed, inject, input, output } from '@angular/core';
import {
  LucideActivity,
  LucideArrowRight,
  LucideDynamicIcon,
  LucideLogOut,
  LucideSparkles,
  LucideX,
} from '@lucide/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { navigationGroups } from '../data/dashboard.data';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [
    LucideActivity,
    LucideArrowRight,
    LucideDynamicIcon,
    LucideLogOut,
    LucideSparkles,
    LucideX,
    RouterLink,
    RouterLinkActive,
  ],
  styles: [':host { display: contents; }'],
  template: `
    <button
      aria-label="Cerrar menú"
      class="sidebar-overlay"
      [class.sidebar-overlay-visible]="open()"
      [tabIndex]="open() ? 0 : -1"
      (click)="closed.emit()"
    ></button>
    <aside class="sidebar" [class.sidebar-open]="open()">
      <div class="brand">
        <div class="brand-mark"><svg lucideActivity [size]="20" [strokeWidth]="2.4"></svg></div>
        <div class="brand-copy">
          <span class="brand-name">Control<span>Stock</span></span>
          <span class="brand-caption">GESTIÓN DE INVENTARIO</span>
        </div>
        <button aria-label="Cerrar menú" class="sidebar-close" (click)="closed.emit()">
          <svg lucideX [size]="19"></svg>
        </button>
      </div>

      <div class="workspace-switcher">
        <div class="workspace-icon">N</div>
        <div class="workspace-copy">
          <strong>ControlStock</strong>
          <span>Inventario y ventas</span>
        </div>
      </div>

      <nav aria-label="Navegación principal" class="sidebar-nav">
        @for (group of groups(); track group.label) {
          <div class="nav-group">
            <p class="nav-heading">{{ group.label }}</p>
            @for (item of group.items; track item.label) {
              <a
                class="nav-link"
                [routerLink]="item.href"
                routerLinkActive="nav-link-active"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="closed.emit()"
              >
                <svg [lucideIcon]="item.icon" [size]="17" [strokeWidth]="1.8"></svg>
                <span>{{ item.label }}</span>
              </a>
            }
          </div>
        }
      </nav>

      <div class="sidebar-bottom">
        <a class="help-card" routerLink="/ia/informe-inventario" (click)="closed.emit()">
          <div class="help-icon"><svg lucideSparkles [size]="17"></svg></div>
          <div>
            <strong>Informe con IA</strong>
            <p>Resumen de tu inventario</p>
          </div>
          <svg lucideArrowRight [size]="15"></svg>
        </a>
        <div class="profile">
          <div class="avatar avatar-user">{{ auth.initials() }}</div>
          <div class="profile-copy">
            <strong>{{ auth.user()?.nombre }}</strong>
            <span>{{ auth.user()?.rol }}</span>
          </div>
          <button aria-label="Cerrar sesión" title="Cerrar sesión" class="icon-button profile-menu" (click)="auth.logout()">
            <svg lucideLogOut [size]="17"></svg>
          </button>
        </div>
      </div>
    </aside>
  `,
})
export class Sidebar {
  readonly open = input(false);
  readonly closed = output<void>();
  protected readonly auth = inject(AuthService);

  /** Solo los ítems permitidos para el rol actual; los grupos que quedan vacíos se ocultan. */
  protected readonly groups = computed(() => {
    const rol = this.auth.user()?.rol;
    return navigationGroups
      .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || (rol && i.roles.includes(rol))) }))
      .filter((g) => g.items.length > 0);
  });
}
