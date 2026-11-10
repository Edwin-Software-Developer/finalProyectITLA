import { Component, input, output } from '@angular/core';
import {
  LucideActivity,
  LucideArrowRight,
  LucideChevronDown,
  LucideCircleHelp,
  LucideDynamicIcon,
  LucidePanelLeftClose,
  LucideX,
} from '@lucide/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { navigationGroups } from '../data/dashboard.data';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideActivity,
    LucideArrowRight,
    LucideChevronDown,
    LucideCircleHelp,
    LucideDynamicIcon,
    LucidePanelLeftClose,
    LucideX,
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
          <span class="brand-name">nexo<span>.</span></span>
          <span class="brand-caption">GESTIÓN INTELIGENTE</span>
        </div>
        <button aria-label="Cerrar menú" class="sidebar-close" (click)="closed.emit()">
          <svg lucideX [size]="19"></svg>
        </button>
      </div>

      <div class="workspace-switcher">
        <div class="workspace-icon">N</div>
        <div class="workspace-copy">
          <strong>Nova Market</strong>
          <span>Plan profesional</span>
        </div>
        <svg lucideChevronDown [size]="15" class="workspace-chevron"></svg>
      </div>

      <nav aria-label="Navegación principal" class="sidebar-nav">
        @for (group of groups; track group.label) {
          <div class="nav-group">
            <p class="nav-heading">{{ group.label }}</p>
            @for (item of group.items; track item.label) {
              <a
                class="nav-link"
                #rla="routerLinkActive"
                routerLinkActive="nav-link-active"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: item.href === '/' }"
                [routerLink]="item.href"
              >
                <svg [lucideIcon]="item.icon" [size]="17" [strokeWidth]="rla.isActive ? 2.2 : 1.8"></svg>
                <span>{{ item.label }}</span>
                @if (item.label === 'Predicciones') {
                  <span class="nav-count">3</span>
                }
              </a>
            }
          </div>
        }
      </nav>

      <div class="sidebar-bottom">
        <div class="help-card">
          <div class="help-icon"><svg lucideCircleHelp [size]="17"></svg></div>
          <div>
            <strong>¿Necesitas ayuda?</strong>
            <p>Visita nuestro centro de ayuda</p>
          </div>
          <svg lucideArrowRight [size]="15"></svg>
        </div>
        <div class="profile">
          <div class="avatar avatar-user">EP</div>
          <div class="profile-copy">
            <strong>Edwin Pérez</strong>
            <span>Administrador</span>
          </div>
          <button aria-label="Opciones de perfil" class="icon-button profile-menu">
            <svg lucidePanelLeftClose [size]="17"></svg>
          </button>
        </div>
      </div>
    </aside>
  `,
})
export class Sidebar {
  readonly open = input(false);
  readonly closed = output<void>();
  protected readonly groups = navigationGroups;
}
