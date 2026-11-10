import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideChevronDown,
  LucideCommand,
  LucideMenu,
  LucideSearch,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { Sidebar } from './components/sidebar';
import { navigationGroups } from './data/dashboard.data';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Sidebar,
    LucideBell,
    LucideChevronDown,
    LucideCommand,
    LucideMenu,
    LucideSearch,
  ],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly breadcrumb = signal({ section: 'General', title: 'Dashboard' });

  constructor() {
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
    return { section: 'General', title: 'No disponible' };
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchOpen.set(true);
      document.getElementById('global-search')?.focus();
    }
    if (event.key === 'Escape') {
      this.menuOpen.set(false);
      this.searchOpen.set(false);
    }
  }
}
