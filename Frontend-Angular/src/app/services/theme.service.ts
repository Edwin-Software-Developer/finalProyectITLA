import { Injectable, computed, signal } from '@angular/core';

export type ModoTema = 'claro' | 'oscuro' | 'sistema';

const STORAGE_KEY = 'controlstock.theme';
const MODOS: readonly ModoTema[] = ['claro', 'oscuro', 'sistema'];

/**
 * Tema de la aplicación. La preferencia se guarda en este navegador (localStorage) y "sistema" sigue el
 * tema del sistema operativo en vivo. El atributo data-theme del <html> activa las variables CSS oscuras;
 * index.html lo fija antes de arrancar Angular para evitar un destello en blanco.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly sistemaOscuro = signal(this.media.matches);

  readonly modo = signal<ModoTema>(this.leer());
  readonly oscuro = computed(() => (this.modo() === 'sistema' ? this.sistemaOscuro() : this.modo() === 'oscuro'));

  constructor() {
    this.media.addEventListener('change', (e) => {
      this.sistemaOscuro.set(e.matches);
      this.aplicar();
    });
    this.aplicar();
  }

  cambiar(modo: ModoTema): void {
    this.modo.set(modo);
    try {
      localStorage.setItem(STORAGE_KEY, modo);
    } catch {
      // Almacenamiento no disponible: el cambio vale solo para esta sesión.
    }
    this.aplicar();
  }

  private aplicar(): void {
    document.documentElement.setAttribute('data-theme', this.oscuro() ? 'dark' : 'light');
  }

  private leer(): ModoTema {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as ModoTema | null;
      return v && MODOS.includes(v) ? v : 'sistema';
    } catch {
      return 'sistema';
    }
  }
}
