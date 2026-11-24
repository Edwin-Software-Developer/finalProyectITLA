import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronDown, LucideLogOut, LucidePalette, LucideUserCog } from '@lucide/angular';
import { AuthService } from '../services/auth.service';

/** Menú del usuario de la barra superior: datos de la sesión y cierre de sesión. */
@Component({
  selector: 'app-user-menu',
  imports: [RouterLink, LucideChevronDown, LucideLogOut, LucidePalette, LucideUserCog],
  styles: `
    :host { position: relative; display: block; }
    .disparador { display: flex; align-items: center; gap: 6px; background: none; border: 0; cursor: pointer; padding: 2px; border-radius: 8px; color: #858e9e; }
    .disparador:hover { background: color-mix(in srgb, #f0f3f8 var(--tint), var(--surface)); }
    .menu { position: absolute; right: 0; top: calc(100% + 8px); width: 240px; z-index: 60; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 10px 30px rgb(15 23 42 / 12%); overflow: hidden; }
    .datos { padding: 12px 14px; border-bottom: 1px solid var(--line); }
    .datos strong { display: block; color: var(--ink); }
    .datos small { display: block; color: var(--muted); overflow-wrap: anywhere; }
    .rol { display: inline-block; margin-top: 6px; padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, #eef4ff var(--tint), var(--surface)); color: color-mix(in srgb, #1e3a8a, white var(--lift)); font-size: 11px; font-weight: 700; }
    .opcion { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border: 0; background: none; font: inherit; color: var(--ink); cursor: pointer; text-decoration: none; text-align: left; }
    .opcion:hover { background: var(--surface-2); }
    .peligro { color: color-mix(in srgb, #b91c1c, white var(--lift)); }
  `,
  template: `
    <button type="button" class="disparador" aria-haspopup="true" [attr.aria-expanded]="abierto()" [attr.title]="auth.user()?.nombre" (click)="abierto.set(!abierto())">
      <div class="avatar avatar-user">{{ auth.initials() }}</div>
      <svg lucideChevronDown [size]="14"></svg>
    </button>

    @if (abierto()) {
      <div class="menu" role="menu">
        <div class="datos">
          <strong>{{ auth.user()?.nombre }}</strong>
          <small>{{ auth.user()?.email }}</small>
          <span class="rol">{{ auth.user()?.rol }}</span>
        </div>
        <a class="opcion" routerLink="/configuracion/apariencia" role="menuitem" (click)="abierto.set(false)">
          <svg lucidePalette [size]="16"></svg> Apariencia
        </a>
        @if (auth.isAdmin()) {
          <a class="opcion" routerLink="/usuarios" role="menuitem" (click)="abierto.set(false)">
            <svg lucideUserCog [size]="16"></svg> Usuarios y roles
          </a>
        }
        <button type="button" class="opcion peligro" role="menuitem" (click)="auth.logout()">
          <svg lucideLogOut [size]="16"></svg> Cerrar sesión
        </button>
      </div>
    }
  `,
})
export class UserMenu {
  protected readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly abierto = signal(false);

  @HostListener('document:click', ['$event'])
  protected fuera(e: Event): void {
    if (this.abierto() && !this.host.nativeElement.contains(e.target as Node)) this.abierto.set(false);
  }

  @HostListener('window:keydown.escape')
  protected escape(): void {
    this.abierto.set(false);
  }
}
