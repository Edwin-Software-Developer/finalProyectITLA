import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LucideMenu } from '@lucide/angular';
import { filter } from 'rxjs';
import { GlobalSearch } from './components/global-search';
import { NotificationsMenu } from './components/notifications-menu';
import { Sidebar } from './components/sidebar';
import { UserMenu } from './components/user-menu';
import { navigationGroups } from './data/dashboard.data';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar, GlobalSearch, NotificationsMenu, UserMenu, LucideMenu],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  // Instanciarlo aquí aplica el tema desde el primer momento.
  private readonly theme = inject(ThemeService);

  protected readonly menuOpen = signal(false);
  protected readonly breadcrumb = signal({ section: 'General', title: 'Dashboard' });

  constructor() {
    // Sesión restaurada de una visita anterior: revalida usuario/rol contra la API.
    if (this.auth.isAuthenticated()) this.auth.refresh();

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.breadcrumb.set(this.resolveBreadcrumb(e.urlAfterRedirects));
        this.menuOpen.set(false);
      });
  }

  private resolveBreadcrumb(url: string): { section: string; title: string } {
    const path = url.split('?')[0].split('#')[0] || '/';
    for (const group of navigationGroups) {
      const item = group.items.find((i) => i.href === path);
      if (item) return { section: group.label, title: item.label };
    }
    // Pantallas fuera del menú (por ejemplo Configuración → Monedas).
    if (path === '/configuracion/apariencia') return { section: 'Configuración', title: 'Apariencia' };
    if (path.startsWith('/configuracion')) return { section: 'Administración', title: 'Configuración' };
    return { section: 'General', title: 'No disponible' };
  }

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    this.menuOpen.set(false);
  }
}
